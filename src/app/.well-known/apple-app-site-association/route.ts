/**
 * Apple's proof that the iOS app may open this site's links. iOS fetches it
 * when the app is installed; links matching `components` then open in the app
 * (see `DeepLinkManager` there) and in the browser for everyone else.
 *
 * A route handler rather than a file in /public: the name has no extension,
 * so a static copy would be served as octet-stream, and Apple wants JSON.
 * It must also be reached without a redirect, which is why `proxy.ts` skips
 * `.well-known/`.
 */
export function GET() {
  return Response.json({
    applinks: {
      details: [
        {
          // <Apple developer team id>.<bundle id>
          appIDs: ["B455H374TA.com.ls.ucsdmcs"],
          // Reminder links only; every other page stays in the browser.
          components: [{ "/": "/events/*" }],
        },
      ],
    },
  });
}
