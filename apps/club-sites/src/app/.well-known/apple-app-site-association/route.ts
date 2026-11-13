/**
 * Apple's proof that Fixture may open app.ucsdmcs.com's event links, which
 * reminder texts carried before the team app moved to app.sllab.io. The app
 * still claims this domain, so those older links open it directly; without
 * the app, `proxy.ts` sends them on to app.sllab.io.
 *
 * A route handler rather than a file in /public: the name has no extension,
 * so a static copy would be served as octet-stream, and Apple wants JSON.
 */
export function GET() {
  return Response.json({
    applinks: {
      details: [
        {
          // <Apple developer team id>.<bundle id>
          appIDs: ["B455H374TA.com.ls.ucsdmcs"],
          components: [{ "/": "/events/*" }],
        },
      ],
    },
  });
}
