import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button } from 'react-bootstrap';
import { ArrowLeft } from 'react-bootstrap-icons';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useNavigate, useParams } from 'react-router-dom';
import './KanbanBoard.css';

// Interfaz para los datos de un candidato
interface Candidate {
  id: string;
  fullName: string;
  currentInterviewStep: string;
  averageScore: number;
}

// Interfaz para los pasos de entrevista
interface InterviewStep {
  id: number;
  name: string;
}

const KanbanBoard: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id;
  
  // Estado mock para posición
  const [position, setPosition] = useState({
    positionName: "Senior Backend Engineer Position"
  });
  
  // Estado mock para pasos de entrevista
  const [interviewSteps, setInterviewSteps] = useState<InterviewStep[]>([
    { id: 1, name: "Llamada telefónica" },
    { id: 2, name: "Entrevista técnica" },
    { id: 3, name: "Entrevista cultural" },
    { id: 4, name: "Entrevista manager" }
  ]);
  
  // Estado mock para candidatos
  const [candidates, setCandidates] = useState<Candidate[]>([
    { id: "1", fullName: "John Doe", currentInterviewStep: "Llamada telefónica", averageScore: 3 },
    { id: "2", fullName: "Alice Johnson", currentInterviewStep: "Llamada telefónica", averageScore: 4 },
    { id: "3", fullName: "Jane Smith", currentInterviewStep: "Entrevista técnica", averageScore: 3 },
    { id: "4", fullName: "Bob Brown", currentInterviewStep: "Entrevista cultural", averageScore: 2 },
    { id: "5", fullName: "Eva White", currentInterviewStep: "Entrevista manager", averageScore: 5 }
  ]);

  useEffect(() => {
    console.log("Position ID:", id);
    // Aquí se cargarían los datos reales de la API
  }, [id]);
  
  // Función para manejar el arrastre y soltar
  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    
    // Si el usuario suelta el elemento fuera de una zona válida
    if (!destination) {
      return;
    }
    
    // Si el usuario suelta el elemento en el mismo lugar
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }
    
    // Obtiene el candidato que se está moviendo
    const candidateId = result.draggableId;
    const updatedCandidates = candidates.map(candidate => {
      if (candidate.id === candidateId) {
        // Actualiza la etapa del candidato al nombre de la columna destino
        return { 
          ...candidate, 
          currentInterviewStep: destination.droppableId 
        };
      }
      return candidate;
    });
    
    setCandidates(updatedCandidates);
    
    // Aquí se llamaría a la API para actualizar el estado del candidato
    // En la implementación final
  };
  
  // Función para renderizar los puntos de score
  const renderScoreDots = (score: number) => {
    const dots = [];
    const maxScore = 5;
    
    for (let i = 0; i < maxScore; i++) {
      dots.push(
        <span 
          key={i} 
          className={`dot ${i < score ? 'filled' : ''}`}
          style={{
            display: 'inline-block',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            margin: '0 2px',
            backgroundColor: i < score ? '#28a745' : '#f8f9fa',
            border: '1px solid #28a745'
          }}
        />
      );
    }
    
    return dots;
  };
  
  return (
    <Container fluid className="mt-4">
      {/* Cabecera con título y botón de retorno */}
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
        </Col>
      </Row>
      
      {/* Tablero Kanban */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Row>
          {interviewSteps.map((step) => (
            <Col key={step.id} xs={12} md={6} lg={3} className="mb-4">
              <Card className="h-100 shadow-sm">
                <Card.Header className="text-center bg-light">{step.name}</Card.Header>
                <Card.Body className="p-2">
                  <Droppable droppableId={step.name}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          minHeight: '300px',
                          backgroundColor: snapshot.isDraggingOver ? '#f8f9fa' : 'white',
                          padding: '8px',
                          borderRadius: '4px'
                        }}
                      >
                        {candidates
                          .filter(candidate => candidate.currentInterviewStep === step.name)
                          .map((candidate, index) => (
                            <Draggable
                              key={candidate.id}
                              draggableId={candidate.id}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="mb-2"
                                  style={{
                                    ...provided.draggableProps.style,
                                    boxShadow: snapshot.isDragging ? '0 4px 8px rgba(0,0,0,0.2)' : 'none',
                                  }}
                                >
                                  <Card.Body className="p-2">
                                    <h5 className="mb-1">{candidate.fullName}</h5>
                                    <div>{renderScoreDots(candidate.averageScore)}</div>
                                  </Card.Body>
                                </Card>
                              )}
                            </Draggable>
                          ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </DragDropContext>
    </Container>
  );
};

export default KanbanBoard; 