import { spawn } from "child_process";
import { NextResponse } from "next/server";

export const api = { bodyParser: false };

export async function POST(request) {
    try {
        const form_data = await request.formData();
        const file = form_data.get("image");

        const proc = spawn("python", ["image_to_latex.py"]);
        proc.stdin.write(Buffer.from(await file.arrayBuffer()));
        proc.stdin.end();

        let stdout = "";
        for await (const chunk of proc.stdout) {
            stdout += chunk.toString();
        }

        let stderr = "";
        for await (const chunk of proc.stderr) {
            stderr += chunk.toString();
        }

        const exit_code = await new Promise(resolve => {
            proc.on("close", resolve);
        });

        if (exit_code) {
            console.log(stderr);
            return NextResponse(500);
        }

        return new NextResponse(stdout, { status: 200 });
    }
    catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}