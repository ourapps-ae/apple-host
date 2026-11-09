"""Platform checks on a macOS machine: `apple` compiles the host sources with the platform checks; `project` generates the Xcode project from the rendered files."""
from pathlib import Path
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[1]
mode = sys.argv[1:]
if mode == ["apple"]:
    with tempfile.TemporaryDirectory() as directory:
        output = Path(directory) / "checks"
        sources = sorted((root / "implementation/apple/Sources").glob("*.swift"))
        subprocess.run(["swiftc", *map(str, sources), str(root / "tests/apple/main.swift"), "-o", str(output)], check=True)
        subprocess.run([str(output)], cwd=root, check=True)
        # The example entry point must type-check against the host sources.
        subprocess.run(["swiftc", "-typecheck", *map(str, sources), str(root / "examples/Application.swift")], check=True)
elif mode == ["project"]:
    with tempfile.TemporaryDirectory() as directory:
        base = Path(directory)
        work = base / "ios"
        subprocess.run(["node", str(root / "tests/apple/generate.ts"), str(work)], check=True)
        # Stand-ins for the folders the application and the other components provide.
        for folder in ("ios/Demo/Sources", "ios/Demo/Resources", "components/apple-host/apple/Sources", "components/other/apple/Sources", "ios/out"):
            (base / folder).mkdir(parents=True, exist_ok=True)
        (work / "Demo/Sources/Stub.swift").write_text("import SwiftUI\n")
        subprocess.run(["xcodegen", "generate", "--spec", "project.yml", "--project", "out"], cwd=work, check=True)
        for plist in ("Demo/Info.plist", "DemoTV/Info.plist", "Demo/MacCatalyst.entitlements", "ExportOptions-ios.plist", "ExportOptions-macos.plist", "ExportOptions-tvos.plist"):
            subprocess.run(["plutil", "-lint", str(work / plist)], check=True)
        project = (work / "out/Demo.xcodeproj/project.pbxproj").read_text()
        for expected in ("app.example.demo", "SUPPORTS_MACCATALYST = YES", "SDKROOT = appletvos;", "TARGETED_DEVICE_FAMILY = 3;", 'TARGETED_DEVICE_FAMILY = "1,2";'):
            assert expected in project, expected
        print("project generated and checked")
else:
    raise SystemExit("expected apple or project")
