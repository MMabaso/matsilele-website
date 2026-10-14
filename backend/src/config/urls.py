from django.conf import settings
from django.contrib import admin
from django.http import FileResponse, Http404
from django.urls import include, path, re_path
from django.views.static import serve

admin.site.site_header = "Matsilele Mabaso — site admin"


def react_app(request, *args, **kwargs):
    """Serve the built React app's index.html for every front-end route (/, /about, /posts/..., /inbox)."""
    index = settings.FRONTEND_DIST / "index.html"
    if not index.exists():
        raise Http404("Frontend not built. In development, open the Vite dev server on :5173 instead.")
    return FileResponse(open(index, "rb"), content_type="text/html")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
]

if settings.SERVE_MEDIA:
    urlpatterns += [re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT})]

# Must be last: anything that isn't the API, admin, static or media is a React route.
urlpatterns += [re_path(r"^(?!(api|admin|static|media)(/|$)).*$", react_app)]
