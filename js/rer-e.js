let jsonResponse;
let jsonMissions;
let jsonArrets;
let stop_Id;

if (localStorage.getItem("stop_id") !== null && localStorage.getItem("stop_id") !== undefined) {
    stop_Id = localStorage.getItem("stop_id");
}

function updateHorairesv2(stopId = 58718) {
    const url = 'https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring';
    const urlArret = "./json/arrets-rer-e.json";
    const urlMission = "./json/dessertes/train-l.json";

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

    fetch(urlMission)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erreur de chargement du fichier JSON : ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            jsonMissions = data
        })
        .catch(error => {
            console.error('Erreur lors du chargement du fichier JSON :', error);
        });

    setTimeout(prochainTrain, 700);
}

updateHorairesv2(stop_Id)

function rechercheCorrespondance(station, mission) {
    return !!(jsonMissions.mission[mission] && jsonMissions.mission[mission].ND.includes(station));

}

function prochainTrain() {
    const monitoredStopVisits = jsonResponse.Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit;
    let station = jsonResponse.Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit[0].MonitoredVehicleJourney.MonitoredCall.StopPointName[0].value;
    document.getElementById('station').textContent = station;
    document.getElementById('horaires').innerHTML = '';

    monitoredStopVisits.forEach((stopVisit, index) => {
            const monitoredVehicleJourney = stopVisit.MonitoredVehicleJourney;
            const operatorRef = monitoredVehicleJourney.OperatorRef.value;
            let arrivalCountdown;
            let quai;
            let mission;
            if (operatorRef.startsWith("SNCF_ACCES_CLOUD")) {
                let expectedArrivalTimestamp;
                let h3quai;
                const lineref = monitoredVehicleJourney.LineRef.value;
                let destName = monitoredVehicleJourney.DestinationName[0].value;
                const expectedArrivalTime = monitoredVehicleJourney.MonitoredCall.ExpectedArrivalTime;
                const expectedDepartureTime = monitoredVehicleJourney.MonitoredCall.ExpectedDepartureTime;
                const destinationDisplay = monitoredVehicleJourney.MonitoredCall.DestinationDisplay[0].value;
                station = monitoredVehicleJourney.MonitoredCall.StopPointName[0].value;
                const aQuai = monitoredVehicleJourney.MonitoredCall.VehicleAtStop;
                if (
                    monitoredVehicleJourney &&
                    monitoredVehicleJourney.MonitoredCall &&
                    monitoredVehicleJourney.MonitoredCall.ArrivalPlatformName &&
                    monitoredVehicleJourney.MonitoredCall.ArrivalPlatformName.value
                ) {
                    quai = monitoredVehicleJourney.MonitoredCall.ArrivalPlatformName.value;
                }
                const retard = monitoredVehicleJourney.MonitoredCall.DepartureStatus;
                let heure_passage;
                let ml = '';
                const now = new Date();

                if (destName !== station) {
                    expectedArrivalTimestamp = new Date(expectedDepartureTime).getTime();
                } else {
                    expectedArrivalTimestamp = new Date(expectedArrivalTime).getTime();
                }
                arrivalCountdown = Math.floor((expectedArrivalTimestamp - now) / (1000 * 60));

                if (arrivalCountdown > 59) {
                    const arrivalTime = new Date(expectedArrivalTimestamp);

                    const hours = arrivalTime.getHours();
                    const minutes = arrivalTime.getMinutes();

                    const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
                    const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;

                    ml = `${formattedHours}:${formattedMinutes}`
                }

                if (station.startsWith("Gare de ")) {
                    station = station.replace("Gare de ", "");
                } else if (station.startsWith("Gare d'")) {
                    station = station.replace("Gare d'", "");
                } else if (station.startsWith("Gare des")) {
                    station = station.replace("Gare des", "Les");
                } else if (station.startsWith("Gare du")) {
                    station = station.replace("Gare du", "");
                } else if (station.startsWith("Gare Saint")) {
                    station = station.replace("Gare Saint", "Paris Saint");
                }

                if (destinationDisplay.startsWith("Gare Saint") || destinationDisplay === "Gare Saint-Lazare") {
                    destName = "Paris Saint-Lazare"
                }
                if (destName.startsWith("Gare de l'")) {
                    destName = destName.replace("Gare de l'", "Paris");
                } else if (destName.startsWith("Gare de ")) {
                    destName = destName.replace("Gare de ", "");
                } else if (destName.startsWith("Gare d'")) {
                    destName = destName.replace("Gare d'", "");
                } else if (destName.startsWith("Gare des")) {
                    destName = destName.replace("Gare des", "Les");
                }


                if (lineref === "STIF:Line::C01729:" && operatorRef.startsWith("SNCF_ACCES_CLOUD") && destName !== station && arrivalCountdown > 0) {
                    mission = monitoredVehicleJourney.JourneyNote[0].value;

                    if (station === "Haussmann Saint-Lazare" || station === "Chelles - Gournay" || (station === "Magenta" && mission === "HONY") || station === "Tournan" || station === "Paris Est" || (station === "Villiers-sur-Marne - Le Plessis-Trévise" && mission === "HOVE")) {
                        if (retard === 'delayed') {
                            heure_passage = "<span class='big-text' style='color:orangered'>Retardé</span>";
                        } else if (arrivalCountdown < 2 && arrivalCountdown > 0) {
                            heure_passage = '<span class="big-text blink" style="color:orangered">Départ imminent.</span>';
                        } else if (aQuai === true || arrivalCountdown <= 0) {
                            heure_passage = '<span class="big-text blink" style="color:orangered">Départ</span>';
                        } else if (ml.includes(":")) {
                            heure_passage = "<span class='ultra-text' style='color:orange'>" + ml + '</span><span></span>';
                        } else if (retard === 'early') {
                            heure_passage = "<span class='big-text' style='color:green'>En avance</span>";
                        } else {
                            heure_passage = "<span class='ultra-text' style='color:orange'>" + arrivalCountdown + '</span><span> mins</span>';
                        }
                    } else {
                        if (retard === 'delayed') {
                            heure_passage = "<span class='big-text' style='color:orangered'>Retardé</span>";
                        } else if (arrivalCountdown < 2 && arrivalCountdown > 0) {
                            heure_passage = '<span class="big-text blink" style="color:orange">À l\'approche.</span>';
                        } else if (aQuai === true || arrivalCountdown === 0 || arrivalCountdown < 0) {
                            heure_passage = '<span class="big-text blink" style="color:orangered">À quai</span>';
                        } else if (ml.includes(":")) {
                            heure_passage = "<span class='ultra-text' style='color:orange'>" + ml + '</span><span></span>';
                        } else if (retard === 'early') {
                            heure_passage = "<span class='big-text' style='color:green'>En avance</span>";
                        } else {
                            heure_passage = "<span class='ultra-text' style='color:orange'>" + arrivalCountdown + '</span><span> mins</span>';
                        }
                    }

                    if (arrivalCountdown > -2 && !rechercheCorrespondance(station, mission)) {
                        // Créer des éléments HTML pour chaque ligne
                        const divHoraireRow = document.createElement('div');
                        divHoraireRow.className = 'horaire-row';
                        divHoraireRow.id = 'genHor' + index;

                        const divContainer = document.createElement('div');
                        //divContainer.style.marginTop = '1rem';

                        /* if (destName === "Mantes la Jolie" && station === "Paris Saint-Lazare") {
                             if (mission === "MALA" || mission === "MELU" || mission === "MOLE" || mission === "MOGA") {
                                 destName = destName + "<small style='color: #8d8d8d'> via Poissy</small>"
                             } else {
                                 destName = destName + "<small style='color: #8d8d8d'> via Conflans</small>"
                             }
                         }

                         if (destName === "Paris Saint-Lazare" && (station === "Mantes la Jolie" || station === "Mantes Station")) {
                             if (mission === "POLO" || mission === "PALE" || mission === "POLA" || mission === "PULE" || station === "PELE" || station === "PILA") {
                                 destName = destName + "<small style='color: #8d8d8d'> via Poissy</small>"
                             } else if (mission === "PAVE") {
                                 destName = destName + "<small style='color: #8d8d8d'> direct</small>"
                             } else {
                                 destName = destName + "<small style='color: #8d8d8d'> via Conflans</small>"
                             }
                         }*/

                        const h1Dest = document.createElement('h1');
                        h1Dest.className = 'dest';
                        h1Dest.id = 'destination' + index;
                        h1Dest.innerHTML = destName;

                        const subtitleDiv = document.createElement('div');
                        subtitleDiv.className = 'horaire-sub';

                        const h3Mission = document.createElement('h3');
                        h3Mission.className = 'mission';
                        h3Mission.id = 'mission' + index;
                        h3Mission.textContent = mission;

                        if (
                            monitoredVehicleJourney &&
                            monitoredVehicleJourney.MonitoredCall &&
                            monitoredVehicleJourney.MonitoredCall.ArrivalPlatformName &&
                            monitoredVehicleJourney.MonitoredCall.ArrivalPlatformName.value
                        ) {
                            h3quai = document.createElement('h3');
                            h3quai.className = 'quai';
                            h3quai.id = 'quai' + index;
                            h3quai.innerHTML = "| <span> Voie </span>" + quai;
                        }

                        const h3Heure = document.createElement('h3');
                        h3Heure.className = 'heure';
                        h3Heure.id = 'heure' + index;
                        h3Heure.innerHTML = heure_passage;


                        divContainer.appendChild(h1Dest);
                        divContainer.appendChild(subtitleDiv);
                        subtitleDiv.appendChild(h3Mission);
                        if (
                            monitoredVehicleJourney &&
                            monitoredVehicleJourney.MonitoredCall &&
                            monitoredVehicleJourney.MonitoredCall.ArrivalPlatformName &&
                            monitoredVehicleJourney.MonitoredCall.ArrivalPlatformName.value
                        ) {
                            subtitleDiv.appendChild(h3quai);
                        }
                        divHoraireRow.appendChild(divContainer);
                        divHoraireRow.appendChild(h3Heure);

                        // Ajouter chaque ligne à la section HTML
                        document.getElementById('horaires').appendChild(divHoraireRow);
                        document.getElementById('station').textContent = station;
                    } else if (arrivalCountdown < -60 && !rechercheCorrespondance(station, mission)) {
                        const divHoraireRow = document.createElement('div');
                        divHoraireRow.className = 'horaire-row';
                        divHoraireRow.id = 'genHor' + index;

                        const h1Dest = document.createElement('h1');
                        h1Dest.className = 'dest';
                        h1Dest.id = 'destination' + index;
                        h1Dest.textContent = "Aucun passage n'est prévu";

                        divHoraireRow.appendChild(h1Dest);

                        document.getElementById('horaires').appendChild(divHoraireRow);
                    }
                }

            }
        }
    )
    ;
    initFlex()
}


function initFlex() {
    let horairesDiv = document.getElementById("horaires");
    if (horairesDiv.children.length > 1) {
        horairesDiv.style.flexDirection = "column";
    }
    let elementHoraires = document.getElementById('horaires');
    let nombreDEnfants = elementHoraires.children.length;
    if (nombreDEnfants === 0) {
        document.getElementById('horaires').innerHTML = "<h1 style='text-align: center; width: 100%'> Aucun passage prévu dans cette gare.</h1>"
    }
}

window.onload = function () {
    setTimeout(prochainTrain, 700);
    setTimeout(initFlex, 701);
};

setInterval(updateHorairesv2(stop_Id), 19000);
setInterval(prochainTrain, 20000);
