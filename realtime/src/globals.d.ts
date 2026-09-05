// types/imageTypes.ts declares PastedImage with an HTMLImageElement. The Worker
// only ever touches PastedImageMeta, but tsc checks the whole file, and the DOM
// lib cannot join @cloudflare/workers-types without clashing on Request,
// Response and WebSocket.
interface HTMLImageElement {
    readonly src: string;
}
