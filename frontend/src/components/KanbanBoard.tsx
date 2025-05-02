import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge } from 'react-bootstrap';
import { ArrowLeft, Star, StarFill } from 'react-bootstrap-icons';
import { useNavigate, useParams } from 'react-router-dom';
import { getPositionInterviewFlow, getPositionCandidates } from '../services/positionService';
import './KanbanBoard.css';

// Interfaces actualizadas para reflejar la estructura real
interface InterviewStep {
  id: number;
  name: string;
  orderIndex?: number;
  interviewFlowId?: number;
  interviewTypeId?: number;
}

// Interfaz para el flujo de entrevista anidado
interface InterviewFlowData {
  id: number;
  description: string;
  interviewSteps: InterviewStep[];
}

// Interfaz para la respuesta del API
interface InterviewFlowResponse {
  positionName?: string;
  interviewFlow?: {
    positionName?: string;
    interviewFlow?: InterviewFlowData;
    interviewSteps?: InterviewStep[];
  };
}

// Interfaz para candidatos
interface Candidate {
  id?: string;
  fullName: string;
  currentInterviewStep: string;
  averageScore: number;
}

interface Position {
  positionName: string;
  interviewSteps: InterviewStep[];
}

const KanbanBoard: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  // Estados 
  const [position, setPosition] = useState<Position>({
    positionName: "Cargando...",
    interviewSteps: []
  });
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});
  
  // Efecto para cargar datos
  useEffect(() => {
    const fetchPositionData = async () => {
      if (!id) {
        setError("ID de posición no proporcionado");
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        console.log("Cargando datos para posición ID:", id);
        
        // Obtener datos del servicio
        const response: InterviewFlowResponse = await getPositionInterviewFlow(id);
        console.log("Respuesta recibida:", response);
        
        // Guardar para depuración
        setDebugInfo(response);
        
        if (!response) {
          throw new Error("No se recibieron datos");
        }
        
        // CORRECCIÓN: Verificar la estructura correcta con la doble anidación
        if (!response.interviewFlow) {
          throw new Error("Estructura de datos inválida: no se encontró interviewFlow");
        }
        
        // Extraer nombre de la posición - puede estar en diferentes niveles
        const positionName = response.positionName || 
                            (response.interviewFlow && response.interviewFlow.positionName) || 
                            "Posición sin nombre";
        
        // CORRECCIÓN: Verificar el acceso correcto a los pasos considerando la doble anidación
        let interviewSteps: InterviewStep[] = [];
        
        // Intentar acceder a los pasos en la estructura anidada
        if (response.interviewFlow.interviewFlow && 
            response.interviewFlow.interviewFlow.interviewSteps && 
            Array.isArray(response.interviewFlow.interviewFlow.interviewSteps)) {
          interviewSteps = response.interviewFlow.interviewFlow.interviewSteps;
        } 
        // Verificar si los pasos están en el primer nivel
        else if (response.interviewFlow.interviewSteps && 
                Array.isArray(response.interviewFlow.interviewSteps)) {
          interviewSteps = response.interviewFlow.interviewSteps;
        } 
        else {
          throw new Error("Estructura de datos inválida: no se encontraron pasos de entrevista");
        }
        
        // Mapear y ordenar steps
        const steps = interviewSteps
          .map((step: InterviewStep) => ({
            id: step.id,
            name: step.name || `Paso ${step.id}`,
            orderIndex: step.orderIndex
          }))
          .sort((a: InterviewStep, b: InterviewStep) => (a.orderIndex || 0) - (b.orderIndex || 0));
        
        if (steps.length === 0) {
          throw new Error("No se encontraron pasos de entrevista");
        }
        
        console.log("Pasos procesados:", steps);
        
        // Actualizar estado con datos procesados
        setPosition({
          positionName,
          interviewSteps: steps
        });
        
        // Cargar candidatos
        await fetchCandidates(id, steps);
        
      } catch (err: any) {
        console.error("Error:", err);
        setError(err.message || "Error desconocido al cargar los datos");
      } finally {
        setLoading(false);
      }
    };

    // Función para obtener los candidatos
    const fetchCandidates = async (positionId: string, steps: InterviewStep[]) => {
      try {
        console.log("Obteniendo candidatos para la posición:", positionId);
        const candidatesData = await getPositionCandidates(positionId);
        console.log("Datos de candidatos recibidos:", candidatesData);
        
        if (!candidatesData || !Array.isArray(candidatesData) || candidatesData.length === 0) {
          console.warn("No se encontraron candidatos o datos inválidos");
          return;
        }
        
        // Procesar los candidatos
        const processedCandidates = candidatesData.map((candidate: Candidate, index: number) => {
          // Asegurarnos de que cada candidato tenga un ID
          const candidateId = candidate.id?.toString() || `candidate-${index}`;
          
          // Manejar el paso actual del candidato
          let currentStep = candidate.currentInterviewStep;
          
          // Si currentInterviewStep es un ID en lugar del nombre
          if (!isNaN(Number(currentStep))) {
            const stepId = Number(currentStep);
            const matchingStep = steps.find(step => step.id === stepId);
            if (matchingStep) {
              currentStep = matchingStep.name;
            } else {
              // Si no encontramos el paso, usamos el primero disponible
              currentStep = steps[0]?.name || "Paso desconocido";
            }
          }
          
          return {
            ...candidate,
            id: candidateId,
            currentInterviewStep: currentStep
          };
        });
        
        console.log("Candidatos procesados:", processedCandidates);
        setCandidates(processedCandidates);
        
      } catch (error) {
        console.error("Error al obtener candidatos:", error);
        // No lanzamos error para que siga mostrando los pasos sin candidatos
      }
    };

    fetchPositionData();
  }, [id]);
  
  // Renderizar estrellas para la puntuación
  const renderScore = (score: number) => {
    const maxScore = 5;
    const stars = [];
    
    for (let i = 1; i <= maxScore; i++) {
      if (i <= score) {
        stars.push(<StarFill key={i} className="text-warning me-1" />);
      } else {
        stars.push(<Star key={i} className="text-muted me-1" />);
      }
    }
    
    return <div className="mt-1">{stars}</div>;
  };
  
  // Mostrar pantalla de carga
  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <h2>Cargando datos de la posición...</h2>
      </Container>
    );
  }
  
  // Mostrar mensaje de error
  if (error) {
    return (
      <Container className="mt-5">
        <div className="d-flex align-items-center mb-4">
          <Button 
            variant="link" 
            className="text-decoration-none p-0 me-2"
            onClick={() => navigate('/positions')}
          >
            <ArrowLeft size={24} />
          </Button>
          <h1 className="d-inline-block m-0">Volver a posiciones</h1>
        </div>
        
        <Alert variant="danger">
          {error}
          <Button 
            variant="outline-primary" 
            className="ms-3"
            onClick={() => window.location.reload()}
          >
            Reintentar
          </Button>
        </Alert>
        
        {/* Panel de depuración */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-light">
            <h4>Información de Depuración:</h4>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
      </Container>
    );
  }
  
  return (
    <Container fluid className="mt-4">
      {/* Cabecera */}
      <Row className="mb-4 align-items-center">
        <Col>
          <Button 
            variant="link" 
            className="text-decoration-none p-0 me-2"
            onClick={() => navigate('/positions')}
          >
            <ArrowLeft size={24} />
          </Button>
          <h1 className="d-inline-block m-0">{position.positionName}</h1>
          {candidates.length > 0 && (
            <Badge bg="primary" className="ms-2">
              {candidates.length} candidatos
            </Badge>
          )}
        </Col>
      </Row>
      
      {/* Panel de depuración */}
      {process.env.NODE_ENV === 'development' && (
        <Row className="mb-4">
          <Col>
            <div className="p-3 bg-light">
              <h4>Información de Depuración:</h4>
              <div>
                <strong>Pasos cargados:</strong> {position.interviewSteps.length}
              </div>
              <div>
                <strong>Candidatos cargados:</strong> {candidates.length}
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                className="mt-2"
                onClick={() => console.log('Debug Info:', {position, candidates})}
              >
                Ver detalles en consola
              </Button>
            </div>
          </Col>
        </Row>
      )}
      
      {/* Tablero de pasos de entrevista */}
      <Row>
        {position.interviewSteps.map((step) => {
          const stepCandidates = candidates.filter(
            candidate => candidate.currentInterviewStep === step.name
          );
          
          return (
            <Col key={step.id} xs={12} md={6} lg={3} className="mb-4">
              <Card className="h-100 shadow-sm">
                <Card.Header className="text-center bg-light d-flex justify-content-between align-items-center">
                  <span>{step.name}</span>
                  {stepCandidates.length > 0 && (
                    <Badge bg="info" pill>
                      {stepCandidates.length}
                    </Badge>
                  )}
                </Card.Header>
                <Card.Body className="p-2">
                  <div
                    style={{
                      minHeight: '300px',
                      backgroundColor: '#f8f9fa',
                      padding: '8px',
                      borderRadius: '4px',
                      overflowY: 'auto'
                    }}
                  >
                    {stepCandidates.length === 0 ? (
                      <div className="text-center text-muted p-4">
                        No hay candidatos en esta etapa
                      </div>
                    ) : (
                      stepCandidates.map(candidate => (
                        <Card 
                          key={candidate.id} 
                          className="mb-2 candidate-card"
                        >
                          <Card.Body className="p-2">
                            <Card.Title className="h6 mb-1">
                              {candidate.fullName}
                            </Card.Title>
                            {renderScore(candidate.averageScore)}
                          </Card.Body>
                        </Card>
                      ))
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Container>
  );
};

export default KanbanBoard; 