let jsonResponse;
let jsonArrets;
let stop_Id;

if (localStorage.getItem("stop_id") !== null && localStorage.getItem("stop_id") !== undefined) {
    stop_Id = localStorage.getItem("stop_id");
}

function updateHorairesv2(stopId = 45102) {
    const url = 'https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring';
    const urlArret = "./json/arrets-rerb.json";

    const headers = {
        'Accept': 'application/json',
        'apikey': ""
    };

    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${url}?MonitoringRef=STIF:StopPoint:Q:` + stopId + `:`, true);

    for (const key in headers) {
        if (headers.hasOwnProperty(key)) {
            xhr.setRequestHeader(key, headers[key]);
        }
    }

    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            jsonResponse = JSON.parse(xhr.responseText);
        }
    };
    xhr.send();

    fetch(urlArret)
        .then(response => {
            if (!response.ok) {
                updateHorairesv2(stopId)
                throw new Error(`Erreur de chargement du fichier JSON : ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            jsonArrets = data
        })
        .catch(error => {
            updateHorairesv2(stopId)
            console.error('Erreur lors du chargement du fichier JSON :', error);
        });
    setTimeout(prochainTrain, 700);
}

updateHorairesv2(stop_Id)

function coherenceJSON(jsonArrets, valeurRecherchee) {
    let valeurTrouvee = null;
    let stopNameTrouve = null;

    for (const arret of jsonArrets) {
        // Vérifier si la valeur recherchée correspond à la partie "IDFM:monomodalStopPlace:" de "stop_id"
        if (arret.stop_id.includes(`IDFM:monomodalStopPlace:${valeurRecherchee}`)) {
            valeurTrouvee = arret.stop_id;
            stopNameTrouve = arret.stop_name;
            break; // Sortir de la boucle une fois qu'une correspondance est trouvée
        }
    }

    // Vérifier si une correspondance a été trouvée
    if (valeurTrouvee !== null) {
        valeurTrouvee = valeurRecherchee;
        updateHorairesv2(valeurTrouvee)
        console.log(valeurTrouvee, stopNameTrouve);
    } else {
        console.log(`Aucune correspondance trouvée pour la valeur ${valeurRecherchee}.`);
    }
}


function prochainTrain() {
    const monitoredStopVisits = jsonResponse.Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit;
    let previousDirection = null;
    let directionCounter = 1;

    // Supprimer les anciennes données
    document.getElementById('horaires').innerHTML = '';

    monitoredStopVisits.forEach((stopVisit, index) => {
        const monitoredVehicleJourney = stopVisit.MonitoredVehicleJourney;
        const operatorRef = monitoredVehicleJourney.OperatorRef.value;
        if (operatorRef.startsWith("SNCF_ACCES_CLOUD")) {
            let expectedArrivalTimestamp;
            const lineref = monitoredVehicleJourney.LineRef.value;
            const directionName = 0;
            const destName = monitoredVehicleJourney.DestinationName[0].value;
            const mission = monitoredVehicleJourney.TrainNumbers.TrainNumberRef[0].value;
            const expectedArrivalTime = monitoredVehicleJourney.MonitoredCall.ExpectedArrivalTime;
            const expectedDepartureTime = monitoredVehicleJourney.MonitoredCall.ExpectedDepartureTime;
            const station = monitoredVehicleJourney.MonitoredCall.StopPointName[0].value;
            const aQuai = monitoredVehicleJourney.MonitoredCall.VehicleAtStop;
            const retard = monitoredVehicleJourney.MonitoredCall.DepartureStatus;

            console.log(destName, ' + ', station)
            if (destName != station) {
                expectedArrivalTimestamp = new Date(expectedDepartureTime).getTime();
            } else {
                expectedArrivalTimestamp = new Date(expectedArrivalTime).getTime();
            }
            const now = new Date();
            const arrivalCountdown = Math.floor((expectedArrivalTimestamp - now) / (1000 * 60));
            console.log(arrivalCountdown)

            let heure_passage = '';

            if (directionName !== previousDirection) {
                if (lineref === "STIF:Line::C01743:" && operatorRef.startsWith("SNCF_ACCES_CLOUD")) {
                    const h3Direction = document.createElement('h3');
                    h3Direction.textContent = `Direction : ${directionName}`;
                    document.getElementById('horaires').appendChild(h3Direction);

                    const newDivHoraires = document.createElement('div');
                    newDivHoraires.id = 'horaires' + directionCounter;
                    directionCounter++;

                    previousDirection = directionName;

                    document.getElementById('horaires').appendChild(newDivHoraires);
                }
            }


            if (lineref === "STIF:Line::C01743:" && operatorRef.startsWith("SNCF_ACCES_CLOUD")) {
                if (retard == 'delayed' || arrivalCountdown > -2 && arrivalCountdown < 0) {
                    heure_passage = "<span class='big-text' style='color:orangered'>Retardé</span>";
                } else if (arrivalCountdown < 2 && arrivalCountdown > 0) {
                    heure_passage = '<span class="big-text blink" style="color:orange">À l\'approche.</span>';
                } else if (aQuai == true || arrivalCountdown == 0) {
                    heure_passage = '<span class="big-text blink" style="color:orangered">À quai</span>';
                } else if (retard == 'early') {
                    heure_passage = "<span class='big-text' style='color:green'>En avance</span>";
                } else {
                    heure_passage = "<span class='ultra-text' style='color:orange'>" + arrivalCountdown + '</span><span> mins</span>';
                }

                if (arrivalCountdown > -2) {
                    // Créer des éléments HTML pour chaque ligne
                    const divHoraireRow = document.createElement('div');
                    divHoraireRow.className = 'horaire-row';
                    divHoraireRow.id = 'genHor' + index;

                    const divContainer = document.createElement('div');
                    divContainer.style.marginTop = '1rem';

                    const h1Dest = document.createElement('h1');
                    h1Dest.className = 'dest';
                    h1Dest.id = 'destination' + index;
                    h1Dest.textContent = destName;

                    const h3Mission = document.createElement('h3');
                    h3Mission.className = 'mission';
                    h3Mission.id = 'mission' + index;
                    h3Mission.textContent = mission;

                    const h3Heure = document.createElement('h3');
                    h3Heure.className = 'heure';
                    h3Heure.id = 'heure' + index;
                    h3Heure.innerHTML = heure_passage;

                    divContainer.appendChild(h1Dest);
                    divContainer.appendChild(h3Mission);
                    divHoraireRow.appendChild(divContainer);
                    divHoraireRow.appendChild(h3Heure);

                    // Ajouter chaque ligne à la section HTML
                    document.getElementById('horaires' + (directionCounter - 1)).appendChild(divHoraireRow);
                    document.getElementById('station').textContent = station;
                }
            }
            console.log(4)
        }
        if (operatorRef.startsWith("RATP-SIV:Operator")) {
            const lineref = monitoredVehicleJourney.LineRef.value;
            const directionName = monitoredVehicleJourney.DirectionName[0].value;
            const destName = monitoredVehicleJourney.DestinationName[0].value;
            const mission = monitoredVehicleJourney.VehicleJourneyName[0].value;
            const expectedArrivalTime = monitoredVehicleJourney.MonitoredCall.ExpectedArrivalTime;
            const expectedDepartureTime = monitoredVehicleJourney.MonitoredCall.ExpectedDepartureTime;
            const station = monitoredVehicleJourney.MonitoredCall.StopPointName[0].value;
            const aQuai = monitoredVehicleJourney.MonitoredCall.VehicleAtStop;
            const retard = monitoredVehicleJourney.MonitoredCall.DepartureStatus;

            const expectedArrivalTimestamp = new Date(expectedArrivalTime).getTime();
            const expectedDepartureTimestamp = new Date(expectedDepartureTime).getTime();
            const now = new Date();
            const arrivalCountdown = Math.floor((expectedArrivalTimestamp - now) / (1000 * 60));
            const departureCountdown = Math.floor((expectedDepartureTimestamp - now) / (1000 * 60));

            let heure_passage = '';

            if (directionName !== previousDirection) {
                if (lineref === "STIF:Line::C01743:" && operatorRef.startsWith("RATP-SIV:Operator")) {
                    const h3Direction = document.createElement('h3');
                    h3Direction.textContent = `Direction : ${directionName}`;
                    document.getElementById('horaires').appendChild(h3Direction);

                    const newDivHoraires = document.createElement('div');
                    newDivHoraires.id = 'horaires' + directionCounter;
                    directionCounter++;

                    previousDirection = directionName;

                    document.getElementById('horaires').appendChild(newDivHoraires);
                }
            }


            if (lineref === "STIF:Line::C01743:" && operatorRef.startsWith("RATP-SIV:Operator")) {
                if (aQuai == true || departureCountdown == 1 || departureCountdown == 0 || departureCountdown <= -1) {
                    heure_passage = '<span class="big-text blink" style="color:orangered">À Quai</span>';
                } else if (departureCountdown == 2) {
                    heure_passage = '<span class="big-text blink" style="color:orange">À l\'approche.</span>';
                } else if (retard == 'delayed') {
                    heure_passage = "<span class='big-text' style='color:orangered'>Retardé</span>";
                } else if (retard == 'early') {
                    heure_passage = "<span class='big-text' style='color:green'>En avance</span>";
                } else {
                    heure_passage = "<span class='ultra-text' style='color:orange'>" + arrivalCountdown + '</span><span> mins</span>';
                }

                // Créer des éléments HTML pour chaque ligne
                const divHoraireRow = document.createElement('div');
                divHoraireRow.className = 'horaire-row';
                divHoraireRow.id = 'genHor' + index;

                const divContainer = document.createElement('div');
                divContainer.style.marginTop = '1rem';

                const h1Dest = document.createElement('h1');
                h1Dest.className = 'dest';
                h1Dest.id = 'destination' + index;
                h1Dest.textContent = destName;

                const h3Mission = document.createElement('h3');
                h3Mission.className = 'mission';
                h3Mission.id = 'mission' + index;
                h3Mission.textContent = mission;

                const h3Heure = document.createElement('h3');
                h3Heure.className = 'heure';
                h3Heure.id = 'heure' + index;
                h3Heure.innerHTML = heure_passage;

                divContainer.appendChild(h1Dest);
                divContainer.appendChild(h3Mission);
                divHoraireRow.appendChild(divContainer);
                divHoraireRow.appendChild(h3Heure);

                // Ajouter chaque ligne à la section HTML
                document.getElementById('horaires' + (directionCounter - 1)).appendChild(divHoraireRow);
                document.getElementById('station').textContent = station;
            }
        }
    });
}


window.onload = function () {
    setTimeout(prochainTrain, 700);
};

setInterval(updateHorairesv2(stop_Id), 19000);
setInterval(prochainTrain, 20000);
