from django.http import HttpResponse


class HealthCheckMiddleware:
    """Answer /healthz with 200 before Django checks the Host header.

    Container platforms (Azure Container Apps, Kubernetes) probe the container by its internal IP,
    which isn't in ALLOWED_HOSTS, so a normal view would reply 400.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path == "/healthz":
            return HttpResponse("ok", content_type="text/plain")
        return self.get_response(request)
