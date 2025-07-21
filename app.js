// V2X Emergency Braking Simulation
class V2XSimulation {
    constructor() {
        this.canvas = document.getElementById('simulationCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Simulation parameters
        this.params = {
            vehicleParams: {
                maxSpeed: 120,
                maxAcceleration: 3.0,
                maxDeceleration: 8.0,
                emergencyDeceleration: 7.0,
                comfortDeceleration: 6.0,
                vehicleLength: 5.0,
                reactionTime: 0.5
            },
            v2xParams: {
                bsmFrequency: 10,
                latencyRange: [20, 100],
                transmissionRange: [100, 500],
                messageTypes: ["BSM", "EEBL", "Emergency Alert"],
                maxLatency: 100,
                minLatency: 20
            },
            displayParams: {
                roadWidth: 300,
                laneWidth: 100,
                vehicleSpacing: 80,
                animationFPS: 60
            }
        };

        // Simulation state
        this.isRunning = true;
        this.startTime = Date.now();
        this.lastFrameTime = 0;
        this.transmissionRange = 300;
        this.latency = 50;

        // Initialize vehicles
        this.vehicles = this.initializeVehicles();
        this.messages = [];
        this.messageQueue = [];

        this.setupEventListeners();
        this.startAnimation();
    }

    initializeVehicles() {
        return [
            {
                id: 1,
                x: 100,
                y: 200,
                speed: 60, // km/h
                targetSpeed: 60,
                acceleration: 0,
                isEmergencyBraking: false,
                lastBSMTime: 0,
                color: '#2196F3',
                status: 'Normal'
            },
            {
                id: 2,
                x: 200,
                y: 200,
                speed: 55,
                targetSpeed: 55,
                acceleration: 0,
                isEmergencyBraking: false,
                lastBSMTime: 0,
                color: '#4CAF50',
                status: 'Normal'
            },
            {
                id: 3,
                x: 300,
                y: 200,
                speed: 50,
                targetSpeed: 50,
                acceleration: 0,
                isEmergencyBraking: false,
                lastBSMTime: 0,
                color: '#FF9800',
                status: 'Normal'
            }
        ];
    }

    setupEventListeners() {
        // Speed controls
        ['speed1', 'speed2', 'speed3'].forEach((id, index) => {
            const slider = document.getElementById(id);
            const valueSpan = document.getElementById(`${id}-value`);
            
            slider.addEventListener('input', (e) => {
                const speed = parseInt(e.target.value);
                valueSpan.textContent = speed;
                this.vehicles[index].targetSpeed = speed;
                this.addMessage(`Vehicle ${index + 1} target speed set to ${speed} km/h`);
            });
        });

        // Emergency brake button
        document.getElementById('emergencyBrake').addEventListener('click', () => {
            this.triggerEmergencyBraking();
        });

        // Transmission range
        document.getElementById('transmissionRange').addEventListener('input', (e) => {
            this.transmissionRange = parseInt(e.target.value);
            document.getElementById('range-value').textContent = this.transmissionRange;
        });

        // Latency control
        document.getElementById('latency').addEventListener('input', (e) => {
            this.latency = parseInt(e.target.value);
            document.getElementById('latency-value').textContent = this.latency;
        });

        // Play/Pause button
        document.getElementById('playPause').addEventListener('click', (e) => {
            this.isRunning = !this.isRunning;
            e.target.textContent = this.isRunning ? 'Pause' : 'Play';
        });

        // Reset button
        document.getElementById('reset').addEventListener('click', () => {
            this.resetSimulation();
        });

        // Canvas mouse events for vehicle dragging
        let isDragging = false;
        let dragVehicle = null;

        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Check if clicking on a vehicle
            for (let vehicle of this.vehicles) {
                const vehicleScreenX = vehicle.x * (this.canvas.width / 800);
                const vehicleScreenY = vehicle.y * (this.canvas.height / 600);
                
                if (Math.abs(x - vehicleScreenX) < 30 && Math.abs(y - vehicleScreenY) < 15) {
                    isDragging = true;
                    dragVehicle = vehicle;
                    break;
                }
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (isDragging && dragVehicle) {
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                dragVehicle.x = (x / this.canvas.width) * 800;
                dragVehicle.y = (y / this.canvas.height) * 600;
                
                // Keep vehicles on road
                dragVehicle.y = Math.max(150, Math.min(450, dragVehicle.y));
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            if (isDragging) {
                this.addMessage(`Vehicle ${dragVehicle.id} repositioned`);
            }
            isDragging = false;
            dragVehicle = null;
        });
    }

    triggerEmergencyBraking() {
        const vehicle1 = this.vehicles[0];
        vehicle1.isEmergencyBraking = true;
        vehicle1.acceleration = -this.params.vehicleParams.emergencyDeceleration;
        vehicle1.status = 'Emergency Braking';
        
        this.addMessage('EMERGENCY: Vehicle 1 applying emergency brakes!');
        this.updateVehicleStatus(1, 'Emergency Braking');
        
        // Broadcast EEBL message
        this.broadcastMessage({
            type: 'EEBL',
            sender: 1,
            timestamp: Date.now(),
            data: {
                emergencyBraking: true,
                deceleration: this.params.vehicleParams.emergencyDeceleration,
                position: { x: vehicle1.x, y: vehicle1.y },
                speed: vehicle1.speed
            }
        });

        // Disable emergency brake button temporarily
        const button = document.getElementById('emergencyBrake');
        button.disabled = true;
        setTimeout(() => {
            button.disabled = false;
        }, 3000);
    }

    broadcastMessage(message) {
        // Add visual transmission effect
        this.messages.push({
            ...message,
            visualEffect: {
                x: this.vehicles[message.sender - 1].x,
                y: this.vehicles[message.sender - 1].y,
                radius: 0,
                alpha: 1.0
            }
        });

        // Simulate message delivery with latency
        this.vehicles.forEach((vehicle, index) => {
            if (vehicle.id !== message.sender) {
                const distance = this.calculateDistance(
                    this.vehicles[message.sender - 1],
                    vehicle
                );
                
                if (distance <= this.transmissionRange) {
                    setTimeout(() => {
                        this.deliverMessage(vehicle.id, message);
                    }, this.latency + Math.random() * 20); // Add some jitter
                }
            }
        });
    }

    deliverMessage(vehicleId, message) {
        const vehicle = this.vehicles[vehicleId - 1];
        
        if (message.type === 'EEBL' && message.data.emergencyBraking) {
            // Calculate appropriate response
            const baseDeceleration = this.params.vehicleParams.comfortDeceleration;
            const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
            
            vehicle.acceleration = -baseDeceleration * randomFactor;
            vehicle.isEmergencyBraking = true;
            vehicle.status = 'Emergency Response';
            
            this.addMessage(`Vehicle ${vehicleId} received EEBL message - applying brakes`);
            this.updateVehicleStatus(vehicleId, 'Emergency Response');
        }
    }

    calculateDistance(vehicle1, vehicle2) {
        const dx = vehicle1.x - vehicle2.x;
        const dy = vehicle1.y - vehicle2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    updatePhysics(deltaTime) {
        if (!this.isRunning) return;

        this.vehicles.forEach((vehicle, index) => {
            // Convert speeds (km/h to m/s for calculations)
            const currentSpeedMS = (vehicle.speed * 1000) / 3600;
            const targetSpeedMS = (vehicle.targetSpeed * 1000) / 3600;

            // Update acceleration based on target speed if not emergency braking
            if (!vehicle.isEmergencyBraking) {
                const speedDiff = targetSpeedMS - currentSpeedMS;
                if (Math.abs(speedDiff) > 0.1) {
                    vehicle.acceleration = Math.sign(speedDiff) * 
                        Math.min(this.params.vehicleParams.maxAcceleration, Math.abs(speedDiff));
                } else {
                    vehicle.acceleration = 0;
                }
            }

            // Update speed
            const newSpeedMS = currentSpeedMS + vehicle.acceleration * deltaTime;
            vehicle.speed = Math.max(0, (newSpeedMS * 3600) / 1000); // Convert back to km/h

            // Update position (simplified - just x-axis movement)
            vehicle.x += currentSpeedMS * deltaTime * 10; // Scale for visualization

            // Check if stopped from emergency braking
            if (vehicle.isEmergencyBraking && vehicle.speed < 0.1) {
                vehicle.speed = 0;
                vehicle.acceleration = 0;
                vehicle.isEmergencyBraking = false;
                vehicle.status = 'Stopped';
                this.updateVehicleStatus(vehicle.id, 'Stopped');
            }

            // Reset position if vehicle goes off screen
            if (vehicle.x > 900) {
                vehicle.x = -50;
            }

            // Update status display
            this.updateVehicleDeceleration(vehicle.id, Math.abs(vehicle.acceleration));
        });
    }

    updateVehicleStatus(vehicleId, status) {
        const statusElement = document.getElementById(`status${vehicleId}`);
        statusElement.textContent = status;
        
        const statusItem = statusElement.closest('.status-item');
        statusItem.classList.remove('alert', 'emergency');
        
        if (status.includes('Emergency')) {
            statusItem.classList.add('emergency');
        } else if (status.includes('Response')) {
            statusItem.classList.add('alert');
        }
    }

    updateVehicleDeceleration(vehicleId, deceleration) {
        const decelElement = document.getElementById(`decel${vehicleId}`);
        decelElement.textContent = `${deceleration.toFixed(1)} m/s²`;
    }

    render() {
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // Clear canvas
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw road
        this.drawRoad();
        
        // Draw communication ranges
        this.drawCommunicationRanges();
        
        // Draw message effects
        this.drawMessageEffects();
        
        // Draw vehicles
        this.drawVehicles();
        
        // Update simulation time
        this.updateSimulationTime();
    }

    drawRoad() {
        const ctx = this.ctx;
        const roadY = 150;
        const roadHeight = 300;
        
        // Road surface
        ctx.fillStyle = '#2d2d2d';
        ctx.fillRect(0, roadY, this.canvas.width, roadHeight);
        
        // Lane dividers
        ctx.strokeStyle = '#ffffff';
        ctx.setLineDash([20, 20]);
        ctx.lineWidth = 2;
        
        for (let i = 1; i < 3; i++) {
            const y = roadY + (roadHeight / 3) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
        
        // Road edges
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, roadY);
        ctx.lineTo(this.canvas.width, roadY);
        ctx.moveTo(0, roadY + roadHeight);
        ctx.lineTo(this.canvas.width, roadY + roadHeight);
        ctx.stroke();
    }

    drawCommunicationRanges() {
        const ctx = this.ctx;
        
        this.vehicles.forEach(vehicle => {
            const x = (vehicle.x / 800) * this.canvas.width;
            const y = (vehicle.y / 600) * this.canvas.height;
            const radius = (this.transmissionRange / 800) * this.canvas.width;
            
            ctx.strokeStyle = 'rgba(33, 184, 198, 0.3)';
            ctx.fillStyle = 'rgba(33, 184, 198, 0.1)';
            ctx.lineWidth = 1;
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        });
    }

    drawMessageEffects() {
        const ctx = this.ctx;
        
        this.messages = this.messages.filter(message => {
            const effect = message.visualEffect;
            
            if (effect.alpha > 0) {
                const x = (effect.x / 800) * this.canvas.width;
                const y = (effect.y / 600) * this.canvas.height;
                
                ctx.strokeStyle = `rgba(255, 69, 58, ${effect.alpha})`;
                ctx.lineWidth = 3;
                
                ctx.beginPath();
                ctx.arc(x, y, effect.radius, 0, 2 * Math.PI);
                ctx.stroke();
                
                effect.radius += 5;
                effect.alpha -= 0.02;
                
                return true;
            }
            return false;
        });
    }

    drawVehicles() {
        const ctx = this.ctx;
        
        this.vehicles.forEach(vehicle => {
            const x = (vehicle.x / 800) * this.canvas.width;
            const y = (vehicle.y / 600) * this.canvas.height;
            
            // Vehicle body
            ctx.fillStyle = vehicle.color;
            ctx.fillRect(x - 25, y - 10, 50, 20);
            
            // Vehicle outline
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 25, y - 10, 50, 20);
            
            // Emergency braking indicator
            if (vehicle.isEmergencyBraking) {
                ctx.fillStyle = '#ff4444';
                ctx.fillRect(x - 27, y - 12, 54, 24);
                ctx.fillStyle = vehicle.color;
                ctx.fillRect(x - 25, y - 10, 50, 20);
            }
            
            // Vehicle ID
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(vehicle.id.toString(), x, y + 5);
            
            // Speed indicator
            ctx.font = '12px Arial';
            ctx.fillText(`${Math.round(vehicle.speed)} km/h`, x, y - 20);
        });
    }

    updateSimulationTime() {
        const currentTime = Date.now();
        const elapsedSeconds = (currentTime - this.startTime) / 1000;
        document.getElementById('simTime').textContent = elapsedSeconds.toFixed(1);
    }

    addMessage(content) {
        const messageQueue = document.getElementById('messageQueue');
        const timestamp = new Date().toLocaleTimeString();
        
        const messageItem = document.createElement('div');
        messageItem.className = 'message-item new';
        messageItem.innerHTML = `
            <div class="message-timestamp">${timestamp}</div>
            <div class="message-content">${content}</div>
        `;
        
        messageQueue.insertBefore(messageItem, messageQueue.firstChild);
        
        // Remove old messages
        while (messageQueue.children.length > 10) {
            messageQueue.removeChild(messageQueue.lastChild);
        }
        
        // Remove animation class after animation completes
        setTimeout(() => {
            messageItem.classList.remove('new');
        }, 300);
    }

    resetSimulation() {
        this.vehicles = this.initializeVehicles();
        this.messages = [];
        this.startTime = Date.now();
        
        // Reset UI
        document.getElementById('speed1').value = 60;
        document.getElementById('speed2').value = 55;
        document.getElementById('speed3').value = 50;
        document.getElementById('speed1-value').textContent = '60';
        document.getElementById('speed2-value').textContent = '55';
        document.getElementById('speed3-value').textContent = '50';
        
        // Reset status displays
        ['status1', 'status2', 'status3'].forEach(id => {
            document.getElementById(id).textContent = 'Normal';
        });
        ['decel1', 'decel2', 'decel3'].forEach(id => {
            document.getElementById(id).textContent = '0.0 m/s²';
        });
        
        // Clear status item classes
        document.querySelectorAll('.status-item').forEach(item => {
            item.classList.remove('alert', 'emergency');
        });
        
        this.addMessage('Simulation reset');
        
        // Reset play/pause button
        document.getElementById('playPause').textContent = 'Pause';
        this.isRunning = true;
    }

    startAnimation() {
        const animate = (currentTime) => {
            const deltaTime = (currentTime - this.lastFrameTime) / 1000;
            this.lastFrameTime = currentTime;
            
            if (deltaTime < 0.1) { // Limit to reasonable time steps
                this.updatePhysics(deltaTime);
            }
            
            this.render();
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    }
}

// Initialize simulation when page loads
document.addEventListener('DOMContentLoaded', () => {
    new V2XSimulation();
});