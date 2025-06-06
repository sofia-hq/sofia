"""Tests for the tracing setup utilities."""

import importlib
import sys
import types
from unittest.mock import MagicMock


def _load_tracing(monkeypatch):
    """Return tracing module with fake opentelemetry dependencies."""

    trace_mod = types.ModuleType("opentelemetry.trace")
    trace_mod.set_tracer_provider = MagicMock()
    trace_mod.get_tracer_provider = MagicMock()
    trace_mod.SpanKind = types.SimpleNamespace(INTERNAL=0, CLIENT=1)

    exporter_mod = types.ModuleType(
        "opentelemetry.exporter.otlp.proto.http.trace_exporter"
    )
    exporter_mod.OTLPSpanExporter = MagicMock()

    sdk_trace = types.ModuleType("opentelemetry.sdk.trace")
    sdk_trace.TracerProvider = MagicMock()
    sdk_export = types.ModuleType("opentelemetry.sdk.trace.export")
    sdk_export.BatchSpanProcessor = MagicMock()

    instr_mod = types.ModuleType("opentelemetry.instrumentation.instrumentor")
    instr_mod.BaseInstrumentor = object

    # Register modules and parents
    root_mod = types.ModuleType("opentelemetry")
    root_mod.trace = trace_mod
    root_mod.instrumentation = types.ModuleType("opentelemetry.instrumentation")
    root_mod.exporter = types.ModuleType("opentelemetry.exporter")
    root_mod.sdk = types.ModuleType("opentelemetry.sdk")
    monkeypatch.setitem(sys.modules, "opentelemetry", root_mod)
    monkeypatch.setitem(sys.modules, "opentelemetry.trace", trace_mod)
    monkeypatch.setitem(sys.modules, "opentelemetry.exporter", root_mod.exporter)
    monkeypatch.setitem(sys.modules, "opentelemetry.exporter.otlp", types.ModuleType("op.exp.otlp"))
    monkeypatch.setitem(sys.modules, "opentelemetry.exporter.otlp.proto", types.ModuleType("op.exp.otlp.proto"))
    monkeypatch.setitem(
        sys.modules,
        "opentelemetry.exporter.otlp.proto.http",
        types.ModuleType("op.exp.otlp.proto.http"),
    )
    monkeypatch.setitem(
        sys.modules,
        "opentelemetry.exporter.otlp.proto.http.trace_exporter",
        exporter_mod,
    )
    root_mod.instrumentation.instrumentor = instr_mod
    monkeypatch.setitem(sys.modules, "opentelemetry.instrumentation", root_mod.instrumentation)
    monkeypatch.setitem(sys.modules, "opentelemetry.instrumentation.instrumentor", instr_mod)
    root_mod.sdk.trace = sdk_trace
    root_mod.sdk.trace.export = sdk_export
    monkeypatch.setitem(sys.modules, "opentelemetry.sdk", root_mod.sdk)
    monkeypatch.setitem(sys.modules, "opentelemetry.sdk.trace", sdk_trace)
    monkeypatch.setitem(sys.modules, "opentelemetry.sdk.trace.export", sdk_export)

    tracing = importlib.import_module("nomos.utils.tracing")
    importlib.reload(tracing)
    return tracing, trace_mod, exporter_mod, sdk_trace, sdk_export


def test_initialize_and_shutdown_tracing(monkeypatch):
    tracing, trace_mod, exporter_mod, sdk_trace, sdk_export = _load_tracing(monkeypatch)

    tracer_instance = MagicMock()
    sdk_trace.TracerProvider.return_value = tracer_instance
    trace_mod.get_tracer_provider.return_value = tracer_instance
    processor = MagicMock()
    sdk_export.BatchSpanProcessor.return_value = processor

    instrumentor = MagicMock()
    monkeypatch.setattr(tracing, "NomosInstrumentor", lambda: instrumentor)

    tracing.initialize_tracing({"tp": 1}, {"ex": 2}, {"sp": 3})

    trace_mod.set_tracer_provider.assert_called_once()
    sdk_trace.TracerProvider.assert_called_once_with(tp=1)
    exporter_mod.OTLPSpanExporter.assert_called_once()
    sdk_export.BatchSpanProcessor.assert_called_once_with(exporter_mod.OTLPSpanExporter.return_value, sp=3)
    tracer_instance.add_span_processor.assert_called_once_with(processor)
    instrumentor.instrument.assert_called_once()

    tracing.shutdown_tracing()
    instrumentor.uninstrument.assert_called_once()

