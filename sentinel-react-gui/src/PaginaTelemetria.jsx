import CardBateria from './CardBateria';
import CardAmbiente from './CardAmbiente';
import CardPropulsores from './CardPropulsores';
import CardDadosIMU from './CardDadosIMU';
import CardForcaG from './CardForcaG'; 
import CardConsola from './CardConsola';

// 1. Receber o isActive
function PaginaTelemetria({ ros, isActive }) {
  return (
    <div className="telemetry-dashboard">
      
      <div className="telemetry-column">
        {/* 2. Enviar o isActive para todos os cartões! */}
        {ros && <CardBateria ros={ros} isActive={isActive} />}
        {ros && <CardAmbiente ros={ros} isActive={isActive} />}
        {ros && <CardForcaG ros={ros} isActive={isActive} />}
      </div>

      <div className="telemetry-column">
        {ros && <CardDadosIMU ros={ros} isActive={isActive} />}
      </div>

      <div className="telemetry-column wide-column">
        {ros && <CardPropulsores ros={ros} isActive={isActive} />}
        {ros && <CardConsola ros={ros} isActive={isActive} />}
      </div>

    </div>
  );
}

export default PaginaTelemetria;