import CardBateria from './CardBateria';
import CardAmbiente from './CardAmbiente';
import CardPropulsores from './CardPropulsores';
import CardDadosIMU from './CardDadosIMU';
import CardForcaG from './CardForcaG'; 

function PaginaTelemetria({ ros }) {
  return (
    <div className="telemetry-dashboard">
      
      {/* COLUNA 1: Energia e Dinâmica */}
      <div className="telemetry-column">
        {ros && <CardBateria ros={ros} />}
        {ros && <CardDadosIMU ros={ros} />} {/* Apenas 1 vez aqui! */}
      </div>

      {/* COLUNA 2: Ambiente e Força G */}
      <div className="telemetry-column">
        {ros && <CardAmbiente ros={ros} />}
        {ros && <CardForcaG ros={ros} />} {/* Metemos a Força G aqui para equilibrar */}
      </div>

      {/* COLUNA 3: Propulsores (Ocupa a altura toda) */}
      <div className="telemetry-column wide-column">
        {ros && <CardPropulsores ros={ros} />}
      </div>

    </div>
  );
}

export default PaginaTelemetria;