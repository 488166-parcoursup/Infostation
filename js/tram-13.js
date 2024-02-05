let jsonResponse;
let jsonArrets;
let stop_Id;

if (localStorage.getItem("stop_id") !== null && localStorage.getItem("stop_id") !== undefined) {
    stop_Id = localStorage.getItem("stop_id");
}

function updateHorairesv2(stopId = 58566) {
    const url = 'https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring';
    const urlArret = "./json/arrets-tram13.json";

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
    let station = jsonResponse.Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit[0].MonitoredVehicleJourney.MonitoredCall.StopPointName[0].value;
    document.getElementById('station').textContent = station;
    document.getElementById('horaires_s1').innerHTML = '';

    monitoredStopVisits.forEach((stopVisit, index) => {
        const monitoredVehicleJourney = stopVisit.MonitoredVehicleJourney;
        const operatorRef = monitoredVehicleJourney.OperatorRef.value;
        let arrivalCountdown;
        if (operatorRef.startsWith("SNCF_ACCES_CLOUD")) {
            let expectedArrivalTimestamp;
            const lineref = monitoredVehicleJourney.LineRef.value;
            const destName = monitoredVehicleJourney.DestinationName[0].value;
            const expectedArrivalTime = monitoredVehicleJourney.MonitoredCall.ExpectedArrivalTime;
            const expectedDepartureTime = monitoredVehicleJourney.MonitoredCall.ExpectedDepartureTime;
            station = monitoredVehicleJourney.MonitoredCall.StopPointName[0].value;
            const aQuai = monitoredVehicleJourney.MonitoredCall.VehicleAtStop;
            const retard = monitoredVehicleJourney.MonitoredCall.ArrivalStatus;
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

            if (lineref === "STIF:Line::C02344:" && operatorRef.startsWith("SNCF_ACCES_CLOUD") && destName !== station) {
                if (station === "Gare Saint-Lazare" || station === "Gare de Mantes la Jolie" || station === "Gare de Boissy l'Aillerie" || station === "Gare de Gisors" || station === "Gare d'Ermont Eaubonne") {
                    if (retard === 'delayed' || arrivalCountdown > -2 && arrivalCountdown < 0) {
                        heure_passage = "<span class='big-text' style='color:orangered'>Retardé</span>";
                    } else if (arrivalCountdown < 2 && arrivalCountdown > 0) {
                        heure_passage = '<span class="big-text blink" style="color:orangered">Départ imminent.</span>';
                    } else if (aQuai === true || arrivalCountdown === 0) {
                        heure_passage = '<span class="big-text blink" style="color:orangered">Départ</span>';
                    } else if (ml.includes(":")) {
                        heure_passage = "<span class='ultra-text' style='color:orange'>" + ml + '</span><span></span>';
                    } else if (retard === 'early') {
                        heure_passage = "<span class='big-text' style='color:green'>En avance</span>";
                    } else {
                        heure_passage = "<span class='ultra-text' style='color:orange'>" + arrivalCountdown + '</span><span> mins</span>';
                    }
                } else {
                    if (retard === 'delayed' || arrivalCountdown > -2 && arrivalCountdown < -2) {
                        heure_passage = "<span class='big-text' style='color:orangered'>Retardé</span>";
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
                }

                if (arrivalCountdown > -2) {
                    // Créer des éléments HTML pour chaque ligne
                    const divHoraireRow = document.createElement('div');
                    divHoraireRow.className = 'horaire-row';
                    divHoraireRow.id = 'genHor' + index;

                    const divContainer = document.createElement('div');
                    //divContainer.style.marginTop = '1rem';

                    const h1Dest = document.createElement('h1');
                    h1Dest.className = 'dest';
                    h1Dest.id = 'destination' + index;
                    h1Dest.textContent = destName;

                    const subtitleDiv = document.createElement('div');
                    subtitleDiv.className = 'horaire-sub';

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
                    document.getElementById('horaires_s1').appendChild(divHoraireRow);
                    document.getElementById('station').textContent = station;
                } else if (arrivalCountdown < -60) {
                    const divHoraireRow = document.createElement('div');
                    divHoraireRow.className = 'horaire-row';
                    divHoraireRow.id = 'genHor' + index;

                    const h1Dest = document.createElement('h1');
                    h1Dest.className = 'dest';
                    h1Dest.id = 'destination' + index;
                    h1Dest.textContent = "Aucun passage n'est prévu";

                    divHoraireRow.appendChild(h1Dest);

                    document.getElementById('horaires_s1').appendChild(divHoraireRow);
                }
            }

        }
    });
}

function initFlex() {
    var horairesDiv = document.getElementById("horaires_s1");
    if (horairesDiv.children.length > 1) {
        horairesDiv.style.flexDirection = "column";
    }

}


window.onload = function () {
    setTimeout(prochainTrain, 700);
    setTimeout(initFlex, 700);
};

setInterval(updateHorairesv2(stop_Id), 19000);
setInterval(prochainTrain, 20000);
