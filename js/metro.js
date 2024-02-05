let jsonResponse;
let jsonArrets;
let stop_Id;

if (localStorage.getItem("stop_id_metro") !== null && localStorage.getItem("stop_id") !== undefined) {
    stop_Id = localStorage.getItem("stop_id_metro");
}

function updateHorairesv2(stopId = 45102) {
    const url = 'https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring';
    const urlArret = "./json/arrets-lignes.json";

    const headers = {
        'Accept': 'application/json',
        'apikey': "SA2gwXmU8tMANuVvb1cei7oQc3FjEGOQ"
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

function prochainTrain() {
    const monitoredStopVisits = jsonResponse.Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit;
    let previousDirection = null;
    let directionCounter = 1;

    // Supprimer les anciennes donnÃ©es
    document.getElementById('horaires').innerHTML = '';

    monitoredStopVisits.forEach((stopVisit, index) => {
        const monitoredVehicleJourney = stopVisit.MonitoredVehicleJourney;
        const operatorRef = monitoredVehicleJourney.OperatorRef.value;
        if (operatorRef.startsWith("SNCF_ACCES_CLOUD")) {
            let expectedArrivalTimestamp;
            const lineref = monitoredVehicleJourney.LineRef.value;
            const directionName = 0;
            let destName = monitoredVehicleJourney.DestinationName[0].value;
            const mission = monitoredVehicleJourney.TrainNumbers.TrainNumberRef[0].value;
            const expectedArrivalTime = monitoredVehicleJourney.MonitoredCall.ExpectedArrivalTime;
            const expectedDepartureTime = monitoredVehicleJourney.MonitoredCall.ExpectedDepartureTime;
            let station = monitoredVehicleJourney.MonitoredCall.StopPointName[0].value;
            const aQuai = monitoredVehicleJourney.MonitoredCall.VehicleAtStop;
            const retard = monitoredVehicleJourney.MonitoredCall.DepartureStatus;
            let ml = '';

            if (destName !== station) {
                expectedArrivalTimestamp = new Date(expectedDepartureTime).getTime();
            } else {
                expectedArrivalTimestamp = new Date(expectedArrivalTime).getTime();
            }
            const now = new Date();
            const arrivalCountdown = Math.floor((expectedArrivalTimestamp - now) / (1000 * 60));
            if (arrivalCountdown > 59) {
                const arrivalTime = new Date(expectedArrivalTimestamp);

                const hours = arrivalTime.getHours();
                const minutes = arrivalTime.getMinutes();

                // Formattez les heures et les minutes pour qu'ils aient toujours deux chiffres
                const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
                const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;

                // La variable result contiendra l'heure au format "hh:mm"
                ml = `${formattedHours}:${formattedMinutes}`
            }

            if (station.startsWith("Gare de ")) {
                station = station.replace("Gare de ", "");
            } else if (station.startsWith("Gare d'")) {
                station = station.replace("Gare d'", "");
            } else if (station.startsWith("Gare des")) {
                station = station.replace("Gare des", "Les");
            } else if (station.startsWith("Gare du")) {
                station = station.replace("Gare du", "Paris");
            }
            if (destName.startsWith("Gare de ")) {
                destName = destName.replace("Gare de ", "");
            } else if (destName.startsWith("Gare du")) {
                destName = destName.replace("Gare du", "Paris ");
            } else if (destName.startsWith("Gare des")) {
                destName = destName.replace("Gare des", "Les");
            } else if (destName.startsWith("Gare d'")) {
                destName = destName.replace("Gare d'", "");
            }

            let heure_passage = '';

            if (directionName !== previousDirection) {
                if (lineref === "STIF:Line::C01742:" && operatorRef.startsWith("SNCF_ACCES_CLOUD")) {
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


            if (lineref === "STIF:Line::C01742:" && operatorRef.startsWith("SNCF_ACCES_CLOUD")) {
                if (retard === 'delayed' || arrivalCountdown < -2 && arrivalCountdown > -4) {
                    heure_passage = "<span class='big-text' style='color:orangered'>RetardÃ©</span>";
                } else if (arrivalCountdown < 2 && arrivalCountdown > 0) {
                    heure_passage = '<span class="big-text blink" style="color:orange">À l\'approche.</span>';
                } else if (aQuai === true || arrivalCountdown === 0) {
                    heure_passage = '<span class="big-text blink" style="color:orangered">À quai</span>';
                } else if (ml.includes(":")) {
                    heure_passage = "<span class='ultra-text' style='color:orange'>" + ml + '</span><span></span>';
                } else if (retard === 'early') {
                    heure_passage = "<span class='big-text' style='color:green'>En avance</span>";
                } else {
                    heure_passage = "<span class='ultra-text' style='color:orange'>" + arrivalCountdown + '</span><span> mins</span>';
                }

                if (arrivalCountdown > -2) {
                    // CrÃ©er des Ã©lÃ©ments HTML pour chaque ligne
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

                    // Ajouter chaque ligne Ã  la section HTML
                    document.getElementById('horaires' + (directionCounter - 1)).appendChild(divHoraireRow);
                    document.getElementById('station').textContent = station;
                    document.getElementById('horaires1').style.width = "100vw"
                }
            }
            console.log(4)
        }
        if (operatorRef.startsWith("RATP-SIV:Operator")) {
            const lineref = monitoredVehicleJourney.LineRef.value;
            const directionName = monitoredVehicleJourney.DirectionName[0].value;
            let destName = monitoredVehicleJourney.DestinationName[0].value;
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
            let ml = '';
            let heure_passage = '';
            if (arrivalCountdown > 59) {
                const arrivalTime = new Date(expectedArrivalTimestamp);

                const hours = arrivalTime.getHours();
                const minutes = arrivalTime.getMinutes();

                // Formattez les heures et les minutes pour qu'ils aient toujours deux chiffres
                const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
                const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;

                // La variable result contiendra l'heure au format "hh:mm"
                ml = `${formattedHours}:${formattedMinutes}`
            }
            if (directionName !== previousDirection) {
                if (lineref === "STIF:Line::C01742:" && operatorRef.startsWith("RATP-SIV:Operator")) {
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

            if (destName === station) {
                destName = "Terminus"
            }


            if (lineref === "STIF:Line::C01742:" && operatorRef.startsWith("RATP-SIV:Operator")) {
                if (aQuai === true || departureCountdown === 0 || departureCountdown <= -1) {
                    heure_passage = '<span class="big-text blink" style="color:orangered">À Quai</span>';
                } else if (arrivalCountdown <= 1) {
                    heure_passage = '<span class="big-text blink" style="color:orange">À l\'approche.</span>';
                } else if (retard === 'delayed') {
                    heure_passage = "<span class='big-text' style='color:orangered'>Retardé</span>";
                } else if (ml.includes(":")) {
                    heure_passage = "<span class='ultra-text' style='color:orange'>" + ml + '</span><span></span>';
                } else if (retard === 'early') {
                    heure_passage = "<span class='big-text' style='color:green'>En avance</span>";
                } else if (isNaN(departureCountdown)) {
                    heure_passage = "<span class='ultra-text' style='color:orange'>" + arrivalCountdown + '</span><span> mins</span>';
                } else {
                    heure_passage = "<span class='ultra-text' style='color:orange'>" + departureCountdown + '</span><span> mins</span>';
                }

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

                // Ajouter chaque ligne Ã  la section HTML
                document.getElementById('horaires' + (directionCounter - 1)).appendChild(divHoraireRow);
                document.getElementById('station').textContent = station;
            }
        }
    });
}

function rechercherStation() {
    const inputValue = document.getElementById('stationSearch').value.toLowerCase();
    const resultsContainer = document.getElementById('stationSearchResults');
    resultsContainer.innerHTML = '';

    jsonArrets.forEach(arret => {
        const stopNameLowerCase = arret.stop_name.toLowerCase();
        if (stopNameLowerCase.includes(inputValue)) {
            const li = document.createElement('li');
            li.textContent = arret.stop_name;
            li.addEventListener('click', () => onStationClick(arret.stop_id, arret.stop_name));
            resultsContainer.appendChild(li);
        }
    });

    if (resultsContainer.children.length > 0) {
        resultsContainer.style.display = 'block';
    } else {
        resultsContainer.style.display = 'none';
    }
}

function onStationClick(stopId, stopName) {
    console.log(`Stop ID: ${extractStopId(stopId)}, Stop Name: ${stopName}`);
    document.getElementById('stationSearch').value = stopName;
    document.getElementById('stationSearchResults').style.display = 'none';
    updateHorairesv2(extractStopId(stopId));
    stop_Id = extractStopId(stopId);
    localStorage.setItem("stop_id_metro", extractStopId(stopId))
    prochainTrain()
}

function extractStopId(stopId) {
    return stopId.split(':').pop(); // Extraire la dernière partie après le dernier ":"
}

window.onload = function () {
    setTimeout(prochainTrain, 700);
};

setInterval(function() {
    updateHorairesv2(stop_Id);
}, 19000);
setInterval(prochainTrain, 20000);