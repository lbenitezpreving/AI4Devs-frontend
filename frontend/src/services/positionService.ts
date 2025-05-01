import axios from 'axios';

const API_URL = 'http://localhost:3010';

// Interfaces para los tipos de datos
interface InterviewStep {
  id: number;
  interviewFlowId: number;
  interviewTypeId: number;
  name: string;
  orderIndex: number;
}

interface InterviewFlow {
  id: number;
  description: string;
  interviewSteps: InterviewStep[];
}

interface PositionInterviewFlow {
  positionName: string;
  interviewFlow: InterviewFlow;
}

interface Candidate {
  fullName: string;
  currentInterviewStep: string;
  averageScore: number;
}

interface CandidateStageUpdate {
  applicationId: string;
  currentInterviewStep: string;
}

// Funciones para las llamadas API
export const getPositionInterviewFlow = async (positionId: string): Promise<PositionInterviewFlow> => {
  try {
    const response = await axios.get(`${API_URL}/positions/${positionId}/interviewFlow`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener el flujo de entrevistas:', error);
    throw error;
  }
};

export const getPositionCandidates = async (positionId: string): Promise<Candidate[]> => {
  try {
    const response = await axios.get(`${API_URL}/positions/${positionId}/candidates`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener los candidatos:', error);
    throw error;
  }
};

export const updateCandidateStage = async (candidateId: string, data: CandidateStageUpdate): Promise<any> => {
  try {
    const response = await axios.put(`${API_URL}/candidates/${candidateId}/stage`, data);
    return response.data;
  } catch (error) {
    console.error('Error al actualizar la etapa del candidato:', error);
    throw error;
  }
}; 