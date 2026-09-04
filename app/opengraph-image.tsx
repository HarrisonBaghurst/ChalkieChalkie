import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Chalkie Chalkie | Where effort becomes understanding";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori resolves no CSS custom properties, so the tokens from globals.css
// are restated here as literals. Keep them in step with :root.
const BACKGROUND = "#121212";
const FOREGROUND = "#ebebeb";
const FOREGROUND_SECOND = "#cdcbcb";
const FOREGROUND_THIRD = "#666666";

const OpengraphImage = async () => {
    const [interBold, interRegular] = await Promise.all([
        readFile(join(process.cwd(), "public/fonts/Inter_18pt-Bold.ttf")),
        readFile(join(process.cwd(), "public/fonts/Inter_18pt-Regular.ttf")),
    ]);

    return new ImageResponse(
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "72px 80px",
                backgroundColor: BACKGROUND,
                backgroundImage: `radial-gradient(circle at 78% 22%, #1f1f1f 0%, ${BACKGROUND} 55%)`,
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                }}
            >
                <div
                    style={{
                        width: 14,
                        height: 14,
                        borderRadius: 9999,
                        backgroundColor: FOREGROUND,
                    }}
                />
                <div
                    style={{
                        fontFamily: "InterBold",
                        fontSize: 28,
                        letterSpacing: -0.4,
                        color: FOREGROUND_SECOND,
                    }}
                >
                    Chalkie Chalkie
                </div>
            </div>

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 28,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        fontFamily: "InterBold",
                        fontSize: 84,
                        lineHeight: 1.02,
                        letterSpacing: -2,
                        color: FOREGROUND,
                    }}
                >
                    <div>Where effort</div>
                    <div>becomes understanding.</div>
                </div>
                <div
                    style={{
                        fontFamily: "InterRegular",
                        fontSize: 32,
                        color: FOREGROUND_SECOND,
                    }}
                >
                    A real-time workspace for tutors and their students.
                </div>
            </div>

            <div
                style={{
                    display: "flex",
                    width: 96,
                    height: 4,
                    borderRadius: 9999,
                    backgroundColor: FOREGROUND_THIRD,
                }}
            />
        </div>,
        {
            ...size,
            fonts: [
                {
                    name: "InterBold",
                    data: interBold,
                    style: "normal",
                    weight: 400,
                },
                {
                    name: "InterRegular",
                    data: interRegular,
                    style: "normal",
                    weight: 400,
                },
            ],
        },
    );
};

export default OpengraphImage;
