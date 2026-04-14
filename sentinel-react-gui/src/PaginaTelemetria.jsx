import CardBateria from './CardBateria';
import CardAmbiente from './CardAmbiente';
import CardPropulsores from './CardPropulsores';
import CardDadosIMU from './CardDadosIMU';
import CardForcaG from './CardForcaG'; 
import CardConsola from './CardConsola';

function PaginaTelemetria({ ros }) {
  return (
    <div className="telemetry-dashboard">
      
      <div className="telemetry-column">
        {ros && <CardBateria ros={ros} />}
        {ros && <CardAmbiente ros={ros} />}
        {ros && <CardForcaG ros={ros} />}
      </div>

      <div className="telemetry-column">
        {ros && <CardDadosIMU ros={ros} />}
      </div>

      <div className="telemetry-column wide-column">
        {ros && <CardPropulsores ros={ros} />}
        {ros && <CardConsola ros={ros} />}
      </div>

    </div>
  );
}

export default PaginaTelemetria;