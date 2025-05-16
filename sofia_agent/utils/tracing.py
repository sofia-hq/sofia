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

    def instrumentation_dependencies(self):
        # No external dependencies
        return []

    def _instrument(self, **kwargs):
        tracer = trace.get_tracer(__name__)

        # Patch Sofia.create_session
        original_create_session = Sofia.create_session

        def traced_create_session(self, *args, **kwargs):
            with tracer.start_as_current_span(
                "Sofia.create_session",
                kind=SpanKind.INTERNAL,
                attributes={
                    "agent.name": self.name,
                    "agent.class": self.__class__.__name__,
                    "agent.module": self.__class__.__module__,
                },
            ) as span:
                session = original_create_session(self, *args, **kwargs)
                span.set_attribute("session.id", session.session_id)
                span.set_attribute("session.start_time", span.start_time)
                session._otel_root_span_ctx = trace.set_span_in_context(span)
                return session

        Sofia.create_session = traced_create_session

        # Patch FlowSession.next
        original_next = FlowSession.next

        def traced_next(self, *args, **kwargs):
            ctx = getattr(self, "_otel_root_span_ctx", None)
            span_ctx = ctx if ctx is not None else trace.get_current_span()
            with tracer.start_as_current_span(
                "FlowSession.next",
                context=span_ctx,
                kind=SpanKind.INTERNAL,
                attributes={
                    "session.id": self.session_id,
                    "current_step": getattr(self.current_step, "step_id", None),
                    "step.description": getattr(self.current_step, "description", None),
                    "step.available_routes": str(
                        getattr(self.current_step, "routes", [])
                    ),
                    "history.length": len(getattr(self, "history", [])),
                },
            ) as span:
                try:
                    decision, tool_result = original_next(self, *args, **kwargs)
                    span.set_attribute(
                        "decision.action",
                        getattr(getattr(decision, "action", None), "value", None),
                    )
                    span.set_attribute(
                        "decision.input", getattr(decision, "input", None)
                    )
                    if getattr(decision, "tool_name", None):
                        span.set_attribute("tool.name", decision.tool_name)
                        span.set_attribute(
                            "tool.kwargs", str(getattr(decision, "tool_kwargs", {}))
                        )
                    if tool_result is not None:
                        span.set_attribute("tool.result", str(tool_result))
                    span.set_attribute("session.history_length", len(self.history))
                    return decision, tool_result
                except Exception as e:
                    span.record_exception(e)
                    span.set_status(
                        trace.status.Status(trace.status.StatusCode.ERROR, str(e))
                    )
                    raise

        FlowSession.next = traced_next

        # Patch FlowSession._run_tool
        original_run_tool = FlowSession._run_tool

        def traced_run_tool(self, tool_name, kwargs):
            ctx = getattr(self, "_otel_root_span_ctx", None)
            span_ctx = ctx if ctx is not None else trace.get_current_span()
            with tracer.start_as_current_span(
                "FlowSession._run_tool",
                context=span_ctx,
                kind=SpanKind.INTERNAL,
                attributes={
                    "session.id": self.session_id,
                    "tool.name": tool_name,
                    "tool.kwargs": str(kwargs),
                    "step.id": getattr(self, "current_step", None)
                    and self.current_step.step_id,
                },
            ) as span:
                try:
                    result = original_run_tool(self, tool_name, kwargs)
                    span.set_attribute("tool.result", str(result))
                    span.set_attribute("tool.success", True)
                    return result
                except Exception as e:
                    span.record_exception(e)
                    span.set_attribute("tool.success", False)
                    span.set_status(
                        trace.status.Status(trace.status.StatusCode.ERROR, str(e))
                    )
                    raise

        FlowSession._run_tool = traced_run_tool

        # Patch FlowSession._get_next_decision to trace LLM calls
        original_get_next_decision = FlowSession._get_next_decision

        def traced_get_next_decision(self, *args, **kwargs):
            ctx = getattr(self, "_otel_root_span_ctx", None)
            span_ctx = ctx if ctx is not None else trace.get_current_span()
            with tracer.start_as_current_span(
                "llm._get_output",
                context=span_ctx,
                kind=SpanKind.CLIENT,
                attributes={
                    "agent.name": getattr(self, "name", None),
                    "session.id": getattr(self, "session_id", None),
                    "step.id": getattr(self.current_step, "step_id", None),
                    "llm.class": self.llm.__class__.__name__,
                    "llm.provider": getattr(self.llm, "__provider__", None),
                    "llm.model": getattr(self.llm, "model", None),
                    "history.length": len(getattr(self, "history", [])),
                    "system_message": getattr(self, "system_message", None),
                    "persona": getattr(self, "persona", None),
                },
            ) as span:
                try:
                    result = original_get_next_decision(self, *args, **kwargs)
                    span.set_attribute("llm.success", True)
                    # Optionally, add output summary or token usage if available
                    if hasattr(result, "input"):
                        span.set_attribute("llm.output", str(result.input)[:200])
                    return result
                except Exception as e:
                    span.record_exception(e)
                    span.set_attribute("llm.success", False)
                    raise

        FlowSession._get_next_decision = traced_get_next_decision

    def _uninstrument(self, **kwargs):
        # Unpatch Sofia.create_session
        Sofia.create_session = Sofia.create_session.__wrapped__

        # Unpatch FlowSession.next
        FlowSession.next = FlowSession.next.__wrapped__

        # Unpatch FlowSession._run_tool
        FlowSession._run_tool = FlowSession._run_tool.__wrapped__


def initialize_tracing(
    tracer_provider_kwargs: dict = {},
    exporter_kwargs: dict = {},
    span_processor_kwargs: dict = {},
) -> None:
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
        endpoint=f"{os.getenv("ELASTIC_APM_SERVER_URL", "http://localhost:8200")}/v1/traces",
        headers={"Authorization": f"Bearer {os.getenv('ELASTIC_APM_TOKEN', '')}"},
        **exporter_kwargs,
    )

    # Set up the span processor
    span_processor = BatchSpanProcessor(otlp_exporter, **span_processor_kwargs)
    tracer_provider.add_span_processor(span_processor)

    # Initialize OpenTelemetry tracing
    SofiaInstrumentor().instrument()


def shutdown_tracing() -> None:
    """
    Shutdown OpenTelemetry tracing and clean up resources.
    """
    # Uninstrument OpenTelemetry tracing
    SofiaInstrumentor().uninstrument()
