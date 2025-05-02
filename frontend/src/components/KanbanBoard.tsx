import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { ArrowLeft } from 'react-bootstrap-icons';
import { useNavigate, useParams } from 'react-router-dom';
import { getPositionInterviewFlow } from '../services/positionService';
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

interface Position {
  positionName: string;
  interviewSteps: InterviewStep[];
}

const KanbanBoard: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  // Estados simplificados
  const [position, setPosition] = useState<Position>({
    positionName: "Cargando...",
    interviewSteps: []
  });
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
        
      } catch (err: any) {
        console.error("Error:", err);
        setError(err.message || "Error desconocido al cargar los datos");
      } finally {
        setLoading(false);
      }
    };

    fetchPositionData();
  }, [id]);
  
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
              <Button 
                variant="secondary" 
                size="sm" 
                className="mt-2"
                onClick={() => console.log('Debug Info:', debugInfo)}
              >
                Ver detalles en consola
              </Button>
            </div>
          </Col>
        </Row>
      )}
      
      {/* Tablero de pasos de entrevista */}
      <Row>
        {position.interviewSteps.map((step) => (
          <Col key={step.id} xs={12} md={6} lg={3} className="mb-4">
            <Card className="h-100 shadow-sm">
              <Card.Header className="text-center bg-light">
                {step.name}
              </Card.Header>
              <Card.Body className="p-2">
                <div
                  style={{
                    minHeight: '300px',
                    backgroundColor: '#f8f9fa',
                    padding: '8px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <p className="text-muted">
                    Paso {step.id}: {step.name}
                  </p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
};

export default KanbanBoard; 