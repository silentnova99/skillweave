import { describe, expect, it } from "vitest";
import {
  checkDocumentation,
  checkPlaintextSecrets,
  checkProviderSecrets,
  checkRequirements,
  checkRiskyPatterns,
  checkStructure,
} from "@/lib/submissions/analyze";
import { detectKind, detectLanguage } from "@/lib/submissions/detect";
import type { ReviewFile } from "@/lib/submissions/types";

function file(path: string, text: string): ReviewFile {
  return {
    path,
    kind: detectKind(path),
    language: detectLanguage(path),
    sizeBytes: text.length,
    lines: text.split("\n").length,
    text,
    binary: false,
  };
}

describe("detect", () => {
  it("classifies languages and kinds", () => {
    expect(detectLanguage("app/models/user.py")).toBe("python");
    expect(detectLanguage("web/index.tsx")).toBe("typescript");
    expect(detectKind("README.md")).toBe("README");
    expect(detectKind("tests/test_user.py")).toBe("TEST");
    expect(detectKind("package.json")).toBe("CONFIG");
    expect(detectKind("src/util.js")).toBe("SOURCE");
  });
});

describe("security checks", () => {
  it("fails on a committed provider credential", () => {
    const check = checkProviderSecrets([file("config.py", 'KEY = "AKIAIOSFODNN7EXAMPLE"')]);
    expect(check.status).toBe("FAIL");
    expect(check.evidence?.[0]).toMatch(/config\.py:1/);
  });

  it("ignores placeholders but flags literal secret assignments", () => {
    const ok = checkPlaintextSecrets([file("a.py", 'password = "changeme"')]);
    expect(ok.status).toBe("PASS");

    const bad = checkPlaintextSecrets([file("b.py", 'api_key = "9f8a7b6c5d4e"')]);
    expect(bad.status).toBe("WARN");
    expect(bad.evidence?.length).toBe(1);
  });

  it("warns on risky constructs", () => {
    const check = checkRiskyPatterns([file("run.py", "eval(user_input)")]);
    expect(check.status).toBe("WARN");
  });
});

describe("structure and docs", () => {
  it("flags missing source and README", () => {
    const structure = checkStructure([file("notes.txt", "hello")]);
    expect(structure.find((c) => c.id === "structure-source")?.status).toBe("FAIL");

    const docs = checkDocumentation([file("main.py", "x=1")]);
    expect(docs.find((c) => c.id === "docs-readme")?.status).toBe("FAIL");
  });

  it("passes when source, README and manifest are present", () => {
    const structure = checkStructure([
      file("src/main.py", "print('x')"),
      file("requirements.txt", "flask"),
      file("tests/test_main.py", "def test_x(): pass"),
    ]);
    expect(structure.find((c) => c.id === "structure-source")?.status).toBe("PASS");
    expect(structure.find((c) => c.id === "structure-tests")?.status).toBe("PASS");

    const docs = checkDocumentation([
      file("README.md", "# App\n\n## Install\nrun npm install and npm test"),
    ]);
    expect(docs.find((c) => c.id === "docs-readme")?.status).toBe("PASS");
    expect(docs.find((c) => c.id === "docs-setup")?.status).toBe("PASS");
  });
});

describe("requirements coverage", () => {
  it("is skipped without criteria", () => {
    expect(checkRequirements([], []).status).toBe("SKIPPED");
  });

  it("matches criteria by keyword coverage", () => {
    const check = checkRequirements(
      ["Provide a REST endpoint that returns users", "Add automated tests"],
      [file("app.py", "def get_users(): return rest_endpoint_users()"), file("tests/test_app.py", "def test_users(): ...")],
    );
    expect(["PASS", "WARN"]).toContain(check.status);
    expect(check.detail).toMatch(/heuristic/i);
  });
});
