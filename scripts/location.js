const indiaData = {
    "Maharashtra": {
        "Mumbai City": ["Bandra", "Colaba", "Dadar", "Andheri"],
        "Pune": ["Kothrud", "Hinjewadi", "Viman Nagar"],
    },
    "Delhi": {
        "New Delhi": ["Connaught Place", "Lajpat Nagar", "Saket"],
        "South Delhi": ["Hauz Khas", "Greater Kailash"]
    }
    // You can find the full JSON of India States/Districts on GitHub
};

function populateStates() {
    const stateSelect = document.getElementById('stateSelect');
    Object.keys(indiaData).forEach(state => {
        stateSelect.options.add(new Option(state, state));
    });

    stateSelect.onchange = function() {
        const distSelect = document.getElementById('districtSelect');
        distSelect.disabled = false;
        distSelect.innerHTML = '<option>Select District</option>';
        Object.keys(indiaData[this.value]).forEach(dist => {
            distSelect.options.add(new Option(dist, dist));
        });
    };
}