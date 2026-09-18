import { useState, useEffect } from 'react';
import { synapseCore } from '@/services/synapseCore';
export { HACKATHON_DEMO_STEPS } from '@/services/synapseCore';

export function useSynapse() {
  const [state, setState] = useState(() => synapseCore.getState());

  useEffect(() => {
    const unsubscribe = synapseCore.subscribe(() => {
      setState({ ...synapseCore.getState() });
    });
    return unsubscribe;
  }, []);

  return {
    ...state,
    setDemoStep: (step: number) => synapseCore.setDemoStep(step),
    analyzeTextForAcademicActions: (text: string) => synapseCore.analyzeTextForAcademicActions(text),
    addExtractedActionToTasks: (actionId: string) => synapseCore.addExtractedActionToTasks(actionId),
    recordQuizResult: (quizId: string, score: number, maxScore: number, conceptTag: string) =>
      synapseCore.recordQuizResult(quizId, score, maxScore, conceptTag),
    markMissedClassRecovered: () => synapseCore.markMissedClassRecovered(),
    updateTaskStatus: (taskId: string, status: 'pending' | 'in_progress' | 'completed') =>
      synapseCore.updateTaskStatus(taskId, status),
    addTask: (title: string, subject: string, description: string, deadline: string, priority: 'HIGH' | 'MEDIUM' | 'LOW', estimatedMinutes: number) =>
      synapseCore.addTask(title, subject, description, deadline, priority, estimatedMinutes),
    updateAccessibility: (settings: Parameters<typeof synapseCore.updateAccessibility>[0]) =>
      synapseCore.updateAccessibility(settings),
    speakText: (text: string, onEnd?: () => void) => synapseCore.speakText(text, onEnd),
    stopSpeaking: () => synapseCore.stopSpeaking(),
    resetToDefaultDemo: () => synapseCore.resetToDefaultDemo(),
    switchRole: (role: 'student' | 'teacher') => synapseCore.switchRole(role),
    createClassroom: (name: string, code: string, section: string, academicYear: string, description: string, classCode?: string) =>
      synapseCore.createClassroom(name, code, section, academicYear, description, classCode),
    joinClassroom: (classCode: string) => synapseCore.joinClassroom(classCode),
    postClassroomAnnouncement: (classroomId: string, title: string, content: string, type?: Parameters<typeof synapseCore.postClassroomAnnouncement>[3]) =>
      synapseCore.postClassroomAnnouncement(classroomId, title, content, type),
    createTeacherAssignment: (...args: Parameters<typeof synapseCore.createTeacherAssignment>) =>
      synapseCore.createTeacherAssignment(...args),
    submitStudentAssignment: (assignmentId: string, classroomId: string, text: string) =>
      synapseCore.submitStudentAssignment(assignmentId, classroomId, text),
    logLearningEvent: (type: Parameters<typeof synapseCore.logLearningEvent>[0], title: string, code: string, detail: string) =>
      synapseCore.logLearningEvent(type, title, code, detail),
  };
}
