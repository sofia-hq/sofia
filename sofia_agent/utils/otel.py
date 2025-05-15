import os

from opentelemetry.instrumentation.instrumentor import BaseInstrumentor
from opentelemetry import trace
from opentelemetry.trace import SpanKind
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

from ..core import Sofia, FlowSession

class SofiaInstrumentor(BaseInstrumentor):
    """
    Instrumentor for the Sofia library to add OpenTelemetry tracing.
    """

    def _instrument(self, **kwargs):
        tracer = trace.get_tracer(__name__)

        # Patch Sofia.create_session
        original_create_session = Sofia.create_session

        def traced_create_session(self, *args, **kwargs):
            with tracer.start_as_current_span(
                "Sofia.create_session",
                kind=SpanKind.INTERNAL,
                attributes={"agent.name": self.name}
            ) as span:
                session = original_create_session(self, *args, **kwargs)
                span.set_attribute("session.id", session.session_id)
                return session

        Sofia.create_session = traced_create_session

        # Patch FlowSession.next
        original_next = FlowSession.next

        def traced_next(self, *args, **kwargs):
            tracer = trace.get_tracer(__name__)
            with tracer.start_as_current_span(
                "FlowSession.next",
                kind=SpanKind.INTERNAL,
                attributes={
                    "session.id": self.session_id,
                    "current_step": getattr(self.current_step, "step_id", None),
                },
            ) as span:
                try:
                    decision, tool_result = original_next(self, *args, **kwargs)
                    span.set_attribute("decision.action", getattr(decision, "action", None))
                    if getattr(decision, "tool_name", None):
                        span.set_attribute("tool.name", decision.tool_name)
                        span.set_attribute("tool.kwargs", str(getattr(decision, "tool_kwargs", {})))
                    if tool_result is not None:
                        span.set_attribute("tool.result", str(tool_result))
                    return decision, tool_result
                except Exception as e:
                    span.record_exception(e)
                    span.set_status(trace.status.Status(trace.status.StatusCode.ERROR, str(e)))
                    raise

        FlowSession.next = traced_next

        # Patch FlowSession._run_tool
        original_run_tool = FlowSession._run_tool

        def traced_run_tool(self, tool_name, kwargs):
            with tracer.start_as_current_span(
                "FlowSession._run_tool",
                kind=SpanKind.INTERNAL,
                attributes={
                    "session.id": self.session_id,
                    "tool.name": tool_name,
                    "tool.kwargs": str(kwargs),
                },
            ) as span:
                try:
                    result = original_run_tool(self, tool_name, kwargs)
                    span.set_attribute("tool.result", str(result))
                    return result
                except Exception as e:
                    span.record_exception(e)
                    span.set_status(trace.status.Status(trace.status.StatusCode.ERROR, str(e)))
                    raise

        FlowSession._run_tool = traced_run_tool

    def _uninstrument(self, **kwargs):
        # Unpatch Sofia.create_session
        Sofia.create_session = Sofia.create_session.__wrapped__

        # Unpatch FlowSession.next
        FlowSession.next = FlowSession.next.__wrapped__

        # Unpatch FlowSession._run_tool
        FlowSession._run_tool = FlowSession._run_tool.__wrapped__


def initialize_tracing(tracer_provider_kwargs: dict = {}, exporter_kwargs: dict = {}, span_processor_kwargs: dict = {}) -> None:
    """
    Initialize OpenTelemetry tracing with the specified configuration.

    param tracer_provider_kwargs: Dictionary of arguments for the TracerProvider.
    param exporter_kwargs: Dictionary of arguments for the OTLPSpanExporter.
    param span_processor_kwargs: Dictionary of arguments for the BatchSpanProcessor.
    """

    # Set up OpenTelemetry tracing
    trace.set_tracer_provider(TracerProvider(**tracer_provider_kwargs))
    tracer_provider = trace.get_tracer_provider()

    # Set up the OTLP exporter
    otlp_exporter = OTLPSpanExporter(
        endpoint=os.getenv("ELASTIC_APM_SERVER_URL", "http://localhost:8200"),
        headers={
            "Authorization": f"Bearer {os.getenv('ELASTIC_APM_API_KEY', '')}"
        },
        **exporter_kwargs
    )

    # Set up the span processor
    span_processor = BatchSpanProcessor(otlp_exporter, **span_processor_kwargs)
    tracer_provider.add_span_processor(span_processor)

    # Initialize OpenTelemetry tracing
    SofiaInstrumentor().instrument()

def shutdown_tracing() -> None:
    """
    Shutdown OpenTelemetry tracing and flush any remaining spans.
    """
    # Shutdown OpenTelemetry tracing
    del trace.get_tracer_provider()

    # Uninstrument OpenTelemetry tracing
    SofiaInstrumentor().uninstrument()