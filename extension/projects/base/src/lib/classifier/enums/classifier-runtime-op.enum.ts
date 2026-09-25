/** Operations the offscreen classifier runtime accepts. */
export enum ClassifierRuntimeOp {
  PING = 'ping',
  AVAILABILITY = 'availability',
  CREATE = 'create',
  CLASSIFY = 'classify',
  MEASURE_CONTEXT_USAGE = 'measure_context_usage',
  DESTROY = 'destroy',
  ABORT = 'abort',
  LIST_MODELS = 'list_models',
  DOWNLOAD_MODEL = 'download_model',
  DELETE_MODEL = 'delete_model',
  UNLOAD_MODEL = 'unload_model',
}
