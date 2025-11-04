import { spawn } from "child_process";
import { NextResponse } from "next/server";

export const api = { bodyParser: false };

export async function POST(request: Request): Promise<NextResponse> {
    console.log('running API');
    try {
        const formData = await request.formData();
        const file = formData.get("image");

        if (!(file instanceof Blob)) {
            return NextResponse.json({ error: "No valid image file provided." }, { status: 400 });
        }

        // Spawn Python process
        const proc = spawn("python", ["image_to_latex.py"]);

        // Write image data to stdin
        const buffer = Buffer.from(await file.arrayBuffer());
        proc.stdin.write(buffer);
        proc.stdin.end();

        // Capture stdout and stderr
        let stdout = "";
        let stderr = "";

        for await (const chunk of proc.stdout) {
            stdout += chunk.toString();
        }

        for await (const chunk of proc.stderr) {
            stderr += chunk.toString();
        }

        // Wait for process exit
        const exitCode: number = await new Promise((resolve) => {
            proc.on("close", resolve);
        });

        if (exitCode !== 0) {
            console.error("[Python Error]", stderr);
            return new NextResponse(stderr || "Python script failed", { status: 500 });
        }

        return new NextResponse(stdout, { status: 200 });
    } catch (e) {
        const errorMessage =
            e instanceof Error ? e.message : "Unknown error occurred";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
