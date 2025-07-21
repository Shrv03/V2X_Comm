// Global variables
let map;
let currentSystemType = 'grid-tied';
let monthlyChart, roiChart, costChart;
let currentLocation = { lat: 40.7128, lng: -74.0060, irradiance: 4.5 }; // Default: New York

// Solar irradiance data by location (simplified)
const solarData = {
    'phoenix': { lat: 33.4484, lng: -112.0740, irradiance: 6.5 },
    'miami': { lat: 25.7617, lng: -80.1918, irradiance: 5.8 },
    'denver': { lat: 39.7392, lng: -104.9903, irradiance: 5.5 },
    'seattle': { lat: 47.6062, lng: -122.3321, irradiance: 3.4 },
    'chicago': { lat: 41.8781, lng: -87.6298, irradiance: 4.2 },
    'utah': { lat: 39.5501, lng: -111.8947, irradiance: 5.8 }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    initializeSliders();
    initializeCharts();
    calculateSystem();
});

// Initialize the map
function initializeMap() {
    map = L.map('map').setView([currentLocation.lat, currentLocation.lng], 10);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Add marker for current location
    L.marker([currentLocation.lat, currentLocation.lng])
        .addTo(map)
        .bindPopup('Solar Resource: ' + currentLocation.irradiance + ' kWh/m²/day')
        .openPopup();
}

// Initialize sliders with event listeners
function initializeSliders() {
    const sliders = [
        'consumption', 'roofArea', 'budget', 'electricityRate',
        'batteryCapacity', 'backupDays', 'panelEfficiency', 
        'systemLosses', 'panelCost', 'batteryCost'
    ];
    
    sliders.forEach(sliderId => {
        const slider = document.getElementById(sliderId);
        const valueSpan = document.getElementById(sliderId + 'Value');
        
        slider.addEventListener('input', function() {
            let value = parseFloat(this.value);
            let formattedValue = value;
            
            // Format values based on type
            if (sliderId.includes('Cost') || sliderId === 'electricityRate') {
                formattedValue = '$' + value.toFixed(2);
            } else if (sliderId.includes('Efficiency') || sliderId.includes('Losses')) {
                formattedValue = value + '%';
            } else if (sliderId.includes('Area')) {
                formattedValue = value + ' m²';
            } else if (sliderId.includes('Capacity')) {
                formattedValue = value + ' kWh';
            } else if (sliderId.includes('Days')) {
                formattedValue = value + ' days';
            } else if (sliderId === 'consumption') {
                formattedValue = value + ' kWh';
            } else if (sliderId === 'budget') {
                formattedValue = '$' + value.toLocaleString();
            }
            
            valueSpan.textContent = formattedValue;
            calculateSystem();
        });
    });
}

// Search location function
function searchLocation() {
    const location = document.getElementById('location').value.toLowerCase();
    
    if (solarData[location]) {
        currentLocation = solarData[location];
        updateLocationData();
        map.setView([currentLocation.lat, currentLocation.lng], 10);
        
        // Clear existing markers
        map.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });
        
        // Add new marker
        L.marker([currentLocation.lat, currentLocation.lng])
            .addTo(map)
            .bindPopup('Solar Resource: ' + currentLocation.irradiance + ' kWh/m²/day')
            .openPopup();
            
        calculateSystem();
    } else {
        alert('Location not found. Try: phoenix, miami, denver, seattle, chicago, utah');
    }
}

// Update location data display
function updateLocationData() {
    document.getElementById('irradiance').textContent = currentLocation.irradiance + ' kWh/m²/day';
    document.getElementById('peakSunHours').textContent = currentLocation.irradiance + ' hours';
}

// Select system type
function selectSystemType(type) {
    currentSystemType = type;
    
    // Update button states
    document.querySelectorAll('.system-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Show/hide battery section
    const batterySection = document.getElementById('batterySection');
    if (type === 'off-grid' || type === 'hybrid') {
        batterySection.classList.remove('hidden');
    } else {
        batterySection.classList.add('hidden');
    }
    
    calculateSystem();
}

// Main calculation function
function calculateSystem() {
    const inputs = getInputs();
    const results = performCalculations(inputs);
    updateResults(results);
    updateCharts(results);
}

// Get all input values
function getInputs() {
    return {
        consumption: parseFloat(document.getElementById('consumption').value),
        roofArea: parseFloat(document.getElementById('roofArea').value),
        budget: parseFloat(document.getElementById('budget').value),
        electricityRate: parseFloat(document.getElementById('electricityRate').value),
        batteryCapacity: parseFloat(document.getElementById('batteryCapacity').value),
        backupDays: parseFloat(document.getElementById('backupDays').value),
        panelEfficiency: parseFloat(document.getElementById('panelEfficiency').value),
        systemLosses: parseFloat(document.getElementById('systemLosses').value),
        panelCost: parseFloat(document.getElementById('panelCost').value),
        batteryCost: parseFloat(document.getElementById('batteryCost').value),
        irradiance: currentLocation.irradiance,
        systemType: currentSystemType
    };
}

// Perform all calculations
function performCalculations(inputs) {
    // Calculate required system size
    const dailyProduction = inputs.consumption;
    const systemEfficiency = (100 - inputs.systemLosses) / 100;
    const systemSize = dailyProduction / (inputs.irradiance * systemEfficiency); // kW
    
    // Calculate panel count (assuming 400W panels)
    const panelWattage = 0.4; // 400W panels
    const panelCount = Math.ceil(systemSize / panelWattage);
    
    // Check roof area constraint
    const panelArea = 2.0; // m² per panel
    const requiredArea = panelCount * panelArea;
    const areaConstrained = requiredArea > inputs.roofArea;
    
    if (areaConstrained) {
        const maxPanels = Math.floor(inputs.roofArea / panelArea);
        const actualSystemSize = maxPanels * panelWattage;
        const actualProduction = actualSystemSize * inputs.irradiance * systemEfficiency;
        
        return calculateCosts({
            ...inputs,
            systemSize: actualSystemSize,
            panelCount: maxPanels,
            annualProduction: actualProduction * 365,
            energyDeficit: dailyProduction - actualProduction
        });
    }
    
    return calculateCosts({
        ...inputs,
        systemSize: systemSize,
        panelCount: panelCount,
        annualProduction: dailyProduction * 365,
        energyDeficit: 0
    });
}

// Calculate system costs
function calculateCosts(params) {
    const panelCost = params.panelCount * 400 * params.panelCost; // 400W panels
    const inverterCost = params.systemSize * 0.15 * 1000; // $0.15/W
    const installationCost = params.systemSize * 0.50 * 1000; // $0.50/W
    const otherCosts = params.systemSize * 0.25 * 1000; // $0.25/W (mounting, wiring, etc.)
    
    let batteryCost = 0;
    if (params.systemType === 'off-grid' || params.systemType === 'hybrid') {
        batteryCost = params.batteryCapacity * params.batteryCost;
    }
    
    const totalCost = panelCost + inverterCost + installationCost + otherCosts + batteryCost;
    
    // Calculate annual savings
    const annualSavings = params.annualProduction * params.electricityRate;
    const paybackPeriod = totalCost / annualSavings;
    
    // Calculate LCOE (25-year lifetime)
    const lcoe = totalCost / (params.annualProduction * 25);
    
    return {
        systemSize: params.systemSize,
        panelCount: params.panelCount,
        totalCost: totalCost,
        annualProduction: params.annualProduction,
        paybackPeriod: paybackPeriod,
        lcoe: lcoe,
        annualSavings: annualSavings,
        panelCost: panelCost,
        inverterCost: inverterCost,
        installationCost: installationCost,
        batteryCost: batteryCost,
        otherCosts: otherCosts,
        energyDeficit: params.energyDeficit || 0
    };
}

// Update results display
function updateResults(results) {
    document.getElementById('systemSize').textContent = results.systemSize.toFixed(1) + ' kW';
    document.getElementById('panelCount').textContent = results.panelCount;
    document.getElementById('totalCost').textContent = '$' + results.totalCost.toLocaleString();
    document.getElementById('paybackPeriod').textContent = results.paybackPeriod.toFixed(1);
    document.getElementById('annualProduction').textContent = results.annualProduction.toLocaleString();
    document.getElementById('lcoe').textContent = '$' + results.lcoe.toFixed(3);
}

// Initialize charts
function initializeCharts() {
    // Monthly Energy Chart
    const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
    monthlyChart = new Chart(monthlyCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: 'Solar Production',
                data: [],
                borderColor: 'rgb(255, 206, 84)',
                backgroundColor: 'rgba(255, 206, 84, 0.2)',
                tension: 0.1
            }, {
                label: 'Energy Consumption',
                data: [],
                borderColor: 'rgb(54, 162, 235)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Energy (kWh)'
                    }
                }
            }
        }
    });
    
    // ROI Chart
    const roiCtx = document.getElementById('roiChart').getContext('2d');
    roiChart = new Chart(roiCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Cumulative Savings',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1
            }, {
                label: 'Initial Investment',
                data: [],
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Cumulative ($)'
                    }
                }
            }
        }
    });
    
    // Cost Breakdown Chart
    const costCtx = document.getElementById('costChart').getContext('2d');
    costChart = new Chart(costCtx, {
        type: 'doughnut',
        data: {
            labels: ['Solar Panels', 'Inverter', 'Installation', 'Battery', 'Other'],
            datasets: [{
                data: [],
                backgroundColor: [
                    'rgb(255, 99, 132)',
                    'rgb(54, 162, 235)',
                    'rgb(255, 205, 86)',
                    'rgb(75, 192, 192)',
                    'rgb(153, 102, 255)'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Update charts with new data
function updateCharts(results) {
    const inputs = getInputs();
    
    // Monthly production data (simplified seasonal variation)
    const monthlyMultipliers = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7];
    const monthlyProduction = monthlyMultipliers.map(m => 
        results.annualProduction / 12 * m
    );
    const monthlyConsumption = Array(12).fill(inputs.consumption * 30);
    
    monthlyChart.data.datasets[0].data = monthlyProduction;
    monthlyChart.data.datasets[1].data = monthlyConsumption;
    monthlyChart.update();
    
    // ROI data
    const years = Array.from({length: 26}, (_, i) => i);
    const cumulativeSavings = years.map(year => 
        year * results.annualSavings - results.totalCost
    );
    const investment = Array(26).fill(-results.totalCost);
    
    roiChart.data.labels = years;
    roiChart.data.datasets[0].data = cumulativeSavings;
    roiChart.data.datasets[1].data = investment;
    roiChart.update();
    
    // Cost breakdown
    costChart.data.datasets[0].data = [
        results.panelCost,
        results.inverterCost,
        results.installationCost,
        results.batteryCost,
        results.otherCosts
    ];
    costChart.update();
}

// What-if scenario analysis
function runScenario(scenario) {
    const originalInputs = getInputs();
    let scenarioInputs = {...originalInputs};
    let scenarioName = '';
    
    switch(scenario) {
        case 'efficiency':
            scenarioInputs.panelEfficiency += 5;
            scenarioName = '+5% Panel Efficiency';
            break;
        case 'battery':
            scenarioInputs.batteryCost *= 0.5;
            scenarioName = '50% Battery Cost Reduction';
            break;
        case 'hybrid':
            scenarioInputs.systemType = 'hybrid';
            scenarioName = 'Add Battery Storage';
            break;
        case 'tariff':
            scenarioInputs.electricityRate *= 1.25;
            scenarioName = '+25% Electricity Rate';
            break;
    }
    
    const originalResults = performCalculations(originalInputs);
    const scenarioResults = performCalculations(scenarioInputs);
    
    const costDiff = scenarioResults.totalCost - originalResults.totalCost;
    const paybackDiff = scenarioResults.paybackPeriod - originalResults.paybackPeriod;
    
    const resultsDiv = document.getElementById('scenarioResults');
    resultsDiv.innerHTML = `
        <h4>${scenarioName} Impact:</h4>
        <p><strong>Cost Change:</strong> ${costDiff >= 0 ? '+' : ''}$${costDiff.toLocaleString()}</p>
        <p><strong>Payback Change:</strong> ${paybackDiff >= 0 ? '+' : ''}${paybackDiff.toFixed(1)} years</p>
        <p><strong>New LCOE:</strong> $${scenarioResults.lcoe.toFixed(3)}/kWh</p>
        <p><strong>Annual Production:</strong> ${scenarioResults.annualProduction.toLocaleString()} kWh</p>
    `;
}

// Initialize location data on page load
updateLocationData();
