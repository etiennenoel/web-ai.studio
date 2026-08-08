import {TaskModeEnum} from '../enums/task-mode.enum';

/** The short strings that name a task, wherever a view has to say which one it is showing. */
export interface TaskCopyInterface {
  /** How the switch names this task. */
  switchLabel: string;

  /** How the eyebrow describes the columns. */
  sizesLabel: string;
}

export const TASK_COPY: Record<TaskModeEnum, TaskCopyInterface> = {
  [TaskModeEnum.Text]: {
    switchLabel: 'Text \u2192 text',
    sizesLabel: 'eight model sizes',
  },
  [TaskModeEnum.Audio]: {
    switchLabel: 'Speech \u2192 text',
    sizesLabel: 'five transcription model sizes',
  },
};
