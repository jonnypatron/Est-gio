import CardBateria from './CardBateria';
import CardAmbiente from './CardAmbiente';
import CardPropulsores from './CardPropulsores';
import CardDadosIMU from './CardDadosIMU';
import CardForcaG from './CardForcaG'; 

function PaginaTelemetria({ ros }) {
  return (
    <div className="telemetry-dashboard">
      
      <div className="telemetry-column">
        {ros && <CardBateria ros={ros} />}
        {ros && <CardDadosIMU ros={ros} />} 
      </div>

      <div className="telemetry-column">
        {ros && <CardAmbiente ros={ros} />}
        {ros && <CardForcaG ros={ros} />} 
      </div>

      <div className="telemetry-column wide-column">
        {ros && <CardPropulsores ros={ros} />}
      </div>

    </div>
  );
}

export default PaginaTelemetria;