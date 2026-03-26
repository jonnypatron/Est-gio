import CardBateria from './CardBateria';
import CardAmbiente from './CardAmbiente';
import CardPropulsores from './CardPropulsores';
import CardDadosIMU from './CardDadosIMU';
import CardForcaG from './CardForcaG'; 

function PaginaTelemetria({ ros }) {
    return (
        <>
            <div className="container">
                {ros && <CardBateria ros={ros} />}
                {ros && <CardAmbiente ros={ros} />}
            </div>

            <div className="container">
                {ros && <CardPropulsores ros={ros} />}
            </div>

            <div className="container">
                {ros && <CardDadosIMU ros={ros} />}
                {ros && <CardForcaG ros={ros} />} 
            </div>
        </>
    );
}

export default PaginaTelemetria;