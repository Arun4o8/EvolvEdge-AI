export enum MessageAuthor {
  USER = 'user',
  AI = 'ai',
}

export interface Message {
  author: MessageAuthor;
  text: string;
  timestamp: string;
}

export interface SkillGap {
    skill: string;
    reason: string;
}

export interface LearningResource {
    resource: string;
    description: string;
    type: 'Course' | 'Book' | 'Video' | 'Article' | 'Project' | string;
}

export interface SkillAnalysis {
    skillGaps: SkillGap[];
    learningPlan: LearningResource[];
}

export interface InterviewQuestion {
    question: string;
    category: 'Behavioral' | 'Technical' | 'Situational' | string;
}

export interface InterviewTurn {
    question: string;
    answer: string;
    feedback: string;
}