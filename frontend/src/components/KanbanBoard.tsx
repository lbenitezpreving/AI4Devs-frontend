import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge } from 'react-bootstrap';
import { ArrowLeft, Star, StarFill } from 'react-bootstrap-icons';
import { useNavigate, useParams } from 'react-router-dom';
import { getPositionInterviewFlow, getPositionCandidates, updateCandidateStage } from '../services/positionService';
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
  applicationId?: string;
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
  const [draggedCandidate, setDraggedCandidate] = useState<string | null>(null);
  
  // Nuevo estado para controlar las actualizaciones
  const [updatingCandidates, setUpdatingCandidates] = useState<{[key: string]: boolean}>({});
  const [updateErrors, setUpdateErrors] = useState<{[key: string]: string}>({});
  
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
        const processedCandidates = candidatesData.map((candidate: any, index: number) => {
          // Asegurarnos de que cada candidato tenga un ID y verificar su formato
          // NO generar IDs artificiales, sólo usar los proporcionados por el backend
          const candidateId = candidate.id?.toString() || '';
          console.log(`Candidato ${index} - ID original:`, candidate.id);
          
          // IMPORTANTE: Guardar el ID de la aplicación asociada al candidato
          const applicationId = candidate.applicationId?.toString() || '';
          console.log(`Candidato ${index} - ID de aplicación:`, applicationId);
          
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
            applicationId: applicationId, // Guardar explícitamente el ID de la aplicación
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
  
  // Funciones para drag and drop con HTML5 nativo
  const handleDragStart = (candidateId: string) => {
    setDraggedCandidate(candidateId);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necesario para permitir soltar
  };
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetStepName: string) => {
    e.preventDefault();
    
    if (!draggedCandidate) return;
    
    // Buscar el candidato arrastrado
    const candidateToMove = candidates.find(c => c.id === draggedCandidate);
    
    if (candidateToMove && candidateToMove.currentInterviewStep !== targetStepName) {
      console.log(`Moviendo candidato ${draggedCandidate} de ${candidateToMove.currentInterviewStep} a ${targetStepName}`);
      
      // Actualizar el estado localmente primero para UI responsiva
      const updatedCandidates = candidates.map(candidate => {
        if (candidate.id === draggedCandidate) {
          return {
            ...candidate,
            currentInterviewStep: targetStepName
          };
        }
        return candidate;
      });
      
      setCandidates(updatedCandidates);
      
      // Marcar este candidato como en actualización
      setUpdatingCandidates(prev => ({
        ...prev,
        [draggedCandidate]: true
      }));
      
      // Intentar actualizar en el backend
      try {
        // Buscamos el paso correspondiente en position.interviewSteps
        const targetStep = position.interviewSteps.find(step => step.name === targetStepName);
        
        if (!targetStep) {
          throw new Error(`No se encontró el paso "${targetStepName}"`);
        }
        
        // Verificar el formato del ID del candidato
        // Eliminar posibles prefijos como "candidate-" si existen
        let actualCandidateId = draggedCandidate;
        if (draggedCandidate.startsWith('candidate-')) {
          actualCandidateId = draggedCandidate.replace('candidate-', '');
        }
        
        console.log("ID real del candidato para la API:", actualCandidateId);
        
        // IMPORTANTE: Obtener el ID de la aplicación correcto del candidato
        const applicationId = candidateToMove.applicationId || '';
        console.log("ID de la aplicación para la API:", applicationId);
        
        if (!applicationId) {
          throw new Error("No se pudo obtener el ID de la aplicación para este candidato");
        }
        
        // Datos para la actualización - ahora usamos el ID de aplicación correcto
        const updateData = {
          applicationId: applicationId, // Usamos el ID de la aplicación, no el ID del candidato
          currentInterviewStep: targetStep.id.toString() // El API espera el ID como string, no el nombre
        };
        
        console.log("Enviando actualización al servidor:", updateData);
        console.log("URL de la petición:", `http://localhost:3010/candidates/${actualCandidateId}`);
        
        // Llamar al endpoint con el ID limpio
        await updateCandidateStage(actualCandidateId, updateData);
        
        console.log("Candidato actualizado con éxito en el servidor");
        
        // Limpiar error si existe
        setUpdateErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[draggedCandidate];
          return newErrors;
        });
      } catch (error: any) {
        console.error("Error al actualizar el candidato:", error);
        
        // Guardar el error
        setUpdateErrors(prev => ({
          ...prev,
          [draggedCandidate]: error.message || "Error desconocido"
        }));
        
        // Opcionalmente, podríamos revertir el cambio en la UI
        // setCandidates(prevCandidates);
      } finally {
        // Marcar como no actualizando
        setUpdatingCandidates(prev => {
          const newUpdating = { ...prev };
          delete newUpdating[draggedCandidate];
          return newUpdating;
        });
      }
    }
    
    setDraggedCandidate(null);
  };
  
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
      
      {/* Tablero de pasos de entrevista con drag and drop nativo */}
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
                    className={`kanban-column ${draggedCandidate ? 'drop-target-hover' : ''}`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, step.name)}
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
                        <div 
                          key={candidate.id}
                          draggable
                          onDragStart={() => handleDragStart(candidate.id || '')}
                          className={`draggable-item ${draggedCandidate === candidate.id ? 'dragging' : ''}`}
                        >
                          <Card className={`mb-2 candidate-card ${updatingCandidates[candidate.id || ''] ? 'updating' : ''} ${updateErrors[candidate.id || ''] ? 'update-error' : ''}`}>
                            <Card.Body className="p-2">
                              <Card.Title className="h6 mb-1">
                                {candidate.fullName}
                                {updatingCandidates[candidate.id || ''] && (
                                  <span className="ms-2 text-muted">
                                    <small>(Actualizando...)</small>
                                  </span>
                                )}
                              </Card.Title>
                              {renderScore(candidate.averageScore)}
                              {updateErrors[candidate.id || ''] && (
                                <div className="mt-1 text-danger">
                                  <small>Error: {updateErrors[candidate.id || '']}</small>
                                </div>
                              )}
                            </Card.Body>
                          </Card>
                        </div>
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