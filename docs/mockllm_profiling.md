# MockLLM Profiling Results

This document summarizes the results of running `scripts/profile_mock_llm.py` and highlights areas where performance drops occur.

## Profiling runs

The script was executed with different iteration counts to measure cumulative runtime:

```bash
PYTHONPATH=. python scripts/profile_mock_llm.py -n 1
PYTHONPATH=. python scripts/profile_mock_llm.py -n 3
PYTHONPATH=. python scripts/profile_mock_llm.py -n 10
```

The runs generate `profile.stats` and print the top cumulative time functions. Below is an excerpt from the `-n 10` run:

```
         514401 function calls (445230 primitive calls) in 0.773 seconds
   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
        1    0.001    0.001    0.776    0.776 scripts/profile_mock_llm.py:92(run_scenarios)
       30    0.001    0.000    0.658    0.022 nomos/core.py:249(next)
       30    0.002    0.000    0.654    0.022 nomos/core.py:210(_get_next_decision)
       30    0.000    0.000    0.527    0.018 nomos/llms/base.py:180(_get_output)
       30    0.001    0.000    0.524    0.017 scripts/profile_mock_llm.py:39(get_output)
       60    0.000    0.000    0.523    0.009 pydantic/main.py:535(model_json_schema)
       60    0.006    0.000    0.523    0.009 pydantic/json_schema.py:2379(model_json_schema)
```

## Observations

* The majority of time is spent inside `pydantic` when generating JSON schemas for dynamic models. The repeated calls to `model_json_schema` appear in `MockLLM.get_output` and in `LLMBase._create_decision_model`.
* `_create_decision_model` is executed for every decision even though it is decorated with `@cache`. This is because new `Tool` instances are created for each session, causing cache misses and forcing Pydantic to build a new model and schema every time.
* `nomos.core.Agent.next` and `_get_next_decision` also show high cumulative time, largely due to the model creation described above.

## Potential Improvements

1. **Reuse Decision Models** – Instead of recreating tools for every session, reuse instances or cache the generated decision model per step so that Pydantic schemas are built once.
2. **Avoid Repeated Schema Generation** – `MockLLM.get_output` asserts equality of two schema dictionaries, triggering expensive `model_json_schema` calls. Precompute these schemas or compare model classes directly.
3. **Preload Tool Models** – `Tool.get_args_model` can cache its generated argument model to avoid repeated Pydantic schema creation when tools are reused.
4. **Profile Without Schema Checks** – When profiling core logic, bypass expensive validation to focus on the agent logic itself.

Applying these optimizations should significantly reduce the time spent in Pydantic’s schema generation functions.

## After Optimizations

The Nomos implementation now caches decision models by step and tool name and
skips expensive JSON schema checks in `MockLLM.get_output`. Running with `-n 10`
shows a dramatic improvement:

```
         21338 function calls (21147 primitive calls) in 0.017 seconds
   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
        1    0.000    0.000    0.017    0.017 scripts/profile_mock_llm.py:96(run_scenarios)
       30    0.000    0.000    0.010    0.000 nomos/core.py:249(next)
       10    0.000    0.000    0.006    0.001 nomos/models/tool.py:239(run)
       60    0.000    0.000    0.005    0.000 nomos/llms/base.py:245(_create_decision_model)
```

The runtime dropped from roughly **0.47s** to **0.017s** for ten iterations while
the behaviour of the agent remains the same.
