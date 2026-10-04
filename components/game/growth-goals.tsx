'use client';
import type { State } from '@/game/types';
import { TUTORIAL_STEPS, tutorialProgress } from '@/game/systems/guidance';

/** 튜토리얼이 보이는 동안인지. 이때 장기 목표는 한 줄로 접어 둡니다. */
export const tutorialActive = (s: State) => !!s.tutorial && !s.tutorial.skipped && tutorialProgress(s) < TUTORIAL_STEPS.length;

