async function getTrafficInfoFromBackend(lineId) {
    try {
        const response = await fetch(`http://localhost:3000/api/traffic?lineId=${lineId}`);
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log(data);
        return data;
    } catch (error) {
        console.error('Erreur lors de la récupération des informations de trafic:', error);
    }
}

// Utilisation de la fonction
getTrafficInfoFromBackend('C01742'); // Remplace par l'ID de la ligne souhaitée
