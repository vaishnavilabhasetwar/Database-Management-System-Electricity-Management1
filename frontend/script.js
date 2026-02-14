// १. व्हेरिएबल्स आणि इलेमेंट सिलेक्शन
const modal = document.getElementById('modal');
const openModal = document.getElementById('openModal');
const closeModal = document.getElementById('closeModal');
const billForm = document.getElementById('billForm');
const searchInput = document.getElementById('searchInput');
const darkModeToggle = document.getElementById('darkModeToggle');

let consumptionChart = null;
let allBills = []; 

// २. मॉडेल कंट्रोल
openModal.onclick = () => modal.classList.remove('hidden');
closeModal.onclick = () => modal.classList.add('hidden');

// ३. डार्क मोड (Dark Mode)
if (darkModeToggle) {
    darkModeToggle.onclick = () => {
        document.body.classList.toggle('bg-gray-900');
        document.body.classList.toggle('text-white');
        
        const cards = document.querySelectorAll('.bg-white, .stat-card');
        cards.forEach(card => {
            card.classList.toggle('bg-gray-800');
            card.classList.toggle('text-white');
            card.classList.toggle('border-gray-700');
        });

        const searchBox = document.getElementById('searchInput');
        if(searchBox) searchBox.classList.toggle('bg-gray-700');

        const icon = darkModeToggle.querySelector('i');
        icon.classList.toggle('fa-moon');
        icon.classList.toggle('fa-sun');
    };
}

// ४. टॅरिफ स्लॅब कॅल्क्युलेटर (Tariff Calculator)
function calculateSlab() {
    const units = parseFloat(document.getElementById('unitInput').value) || 0;
    const resultDiv = document.getElementById('slabResult');
    const warningDiv = document.getElementById('slabWarning');
    let totalBill = 0;

    if (units <= 100) {
        totalBill = units * 5;
    } else if (units <= 300) {
        totalBill = (100 * 5) + ((units - 100) * 8);
    } else {
        totalBill = (100 * 5) + (200 * 8) + ((units - 300) * 12);
    }

    resultDiv.innerText = `Estimated: ₹${totalBill.toFixed(2)}`;

    if (units > 90 && units < 100) {
        warningDiv.innerText = "⚠️ Stop at 99 units to stay in the low-cost slab!";
    } else if (units > 290 && units < 300) {
        warningDiv.innerText = "⚠️ Control usage! You are about to enter the ₹12/unit slab.";
    } else {
        warningDiv.innerText = "";
    }
}

// ५. Appliance Usage Calculator
function calculateApplianceUsage() {
    const checkboxes = document.querySelectorAll('input[name="appliance"]:checked');
    let totalEstimatedUnits = 0;

    checkboxes.forEach((cb) => {
        totalEstimatedUnits += parseFloat(cb.value);
    });

    const displayDiv = document.getElementById('applianceTotal');
    if (displayDiv) {
        if (totalEstimatedUnits > 0) {
            displayDiv.innerText = `Estimated Usage: ${totalEstimatedUnits} kWh (monthly)`;
        } else {
            displayDiv.innerText = "";
        }
    }
}

// ६. मल्टी-प्रॉपर्टी सपोर्ट
function switchProperty() {
    fetchBills(); 
}

// ७. स्मार्ट टिप्स
function getEnergyTips(units) {
    if (units > 300) return "⚠️ High Usage: Switch to LED bulbs.";
    if (units > 150) return "💡 Moderate: Use natural light.";
    return "✅ Efficient: Great job!";
}

// ८. स्टेटस अपडेट (Toggle Status)
async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'Paid' ? 'Unpaid' : 'Paid';
    try {
        const response = await fetch(`http://127.0.0.1:5000/update_status/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (response.ok) {
            fetchBills(); 
        } else {
            alert("Status update failed!");
        }
    } catch (error) {
        console.error("Error updating status:", error);
    }
}

// ९. WhatsApp Notification
function sendWhatsApp(id) {
    const bill = allBills.find(b => b.id === id);
    if (!bill) return;
    const phone = "91XXXXXXXXXX"; 
    const statusEmoji = bill.payment_status === 'Paid' ? '✅' : '❌';
    const message = `*PowerLog Bill Update*%0A--------------------------%0A📅 *Month:* ${bill.reading_month}%0A⚡ *Usage:* ${bill.meter_reading} kWh%0A💰 *Amount:* $${bill.bill_amount.toFixed(2)}%0A📊 *Status:* ${statusEmoji} ${bill.payment_status}%0A--------------------------%0APlease pay before due date.`;
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
}

// १०. AI Prediction
function predictNextMonth(data) {
    const predictionDiv = document.getElementById('predictionInfo');
    if (!predictionDiv || data.length < 2) {
        if(predictionDiv) predictionDiv.innerHTML = "<p class='text-sm text-gray-400 italic'>Need more data to predict...</p>";
        return;
    }
    const sorted = [...data].sort((a, b) => new Date(a.reading_month) - new Date(b.reading_month));
    const readings = sorted.map(d => d.meter_reading);
    const lastReading = readings[readings.length - 1];
    let totalDiff = 0;
    for(let i = 1; i < readings.length; i++) { totalDiff += (readings[i] - readings[i-1]); }
    const avgGrowth = totalDiff / (readings.length - 1);
    const predictedUnits = (parseFloat(lastReading) + avgGrowth).toFixed(1);

    predictionDiv.innerHTML = `
        <div class="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg text-gray-800">
            <p class="text-sm text-yellow-700 font-bold"><i class="fas fa-magic mr-2"></i> AI Prediction:</p>
            <p class="text-xl font-bold">${predictedUnits} kWh</p>
        </div>`;
}

// ११. PDF Generator
function downloadPDF(id) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const bill = allBills.find(b => b.id === id);
    if (!bill) return;
    doc.text("POWERLOG BILL RECEIPT", 20, 20);
    doc.autoTable({
        startY: 30,
        head: [['Description', 'Details']],
        body: [['Month', bill.reading_month], ['Usage', `${bill.meter_reading} kWh`], ['Amount', `$${bill.bill_amount.toFixed(2)}`], ['Status', bill.payment_status]],
    });
    doc.save(`Bill_${bill.reading_month}.pdf`);
}

// १२. डेटा लोड करणे (Fetch Bills)
async function fetchBills() {
    try {
        const res = await fetch('http://127.0.0.1:5000/get_bills');
        const data = await res.json();
        allBills = data; 
        
        const mainTbody = document.getElementById('billTableBody');
        const historyTbody = document.getElementById('paymentHistoryBody');
        mainTbody.innerHTML = '';
        historyTbody.innerHTML = '';
        
        let totalPaid = 0, unpaidCount = 0, currentUnits = 0;
        const sortedData = [...data].sort((a, b) => new Date(b.reading_month) - new Date(a.reading_month));

        if (sortedData.length > 0) currentUnits = sortedData[0].meter_reading;

        sortedData.forEach(bill => {
            if(bill.payment_status === 'Paid') totalPaid += bill.bill_amount;
            if(bill.payment_status === 'Unpaid') unpaidCount++;
            
            // १. Recent Bill Records Table
            mainTbody.innerHTML += `
                <tr class="border-b hover:bg-gray-50 text-sm transition-colors">
                    <td class="p-4 font-medium">${bill.reading_month}<br><span class="text-[9px] text-blue-500">${getEnergyTips(bill.meter_reading)}</span></td>
                    <td class="p-4">${bill.meter_reading} kWh</td>
                    <td class="p-4 font-bold">$${bill.bill_amount.toFixed(2)}</td>
                    <td class="p-4 text-center">
                        <button onclick="toggleStatus(${bill.id}, '${bill.payment_status}')" 
                            class="px-2 py-1 rounded-full text-[10px] font-bold transition-all ${bill.payment_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                            ${bill.payment_status}
                        </button>
                    </td>
                    <td class="p-4 flex space-x-3 justify-center">
                        <button onclick="downloadPDF(${bill.id})" class="text-indigo-500"><i class="fas fa-file-pdf"></i></button>
                        <button onclick="sendWhatsApp(${bill.id})" class="text-green-500"><i class="fab fa-whatsapp"></i></button>
                        <button onclick="deleteBill(${bill.id})" class="text-red-400"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;

            // २. दुरुस्त केलेला भाग: Detailed Payment History Table
            // येथे ${bill.consumer_name} वापरल्यामुळे आता डेटाबेस मधील नाव दिसेल
            historyTbody.innerHTML += `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="p-3 text-sm">${bill.reading_month}</td>
                    <td class="p-3 text-sm">${bill.consumer_name || 'Home User'}</td>
                    <td class="p-3 text-sm font-bold text-right">$${bill.bill_amount.toFixed(2)}</td>
                    <td class="p-3 text-center">
                        <span class="text-[10px] ${bill.payment_status === 'Paid' ? 'text-green-600' : 'text-red-600'} font-bold">
                            ${bill.payment_status}
                        </span>
                    </td>
                </tr>`;
        });

        document.getElementById('totalRev').innerText = `$${totalPaid.toFixed(2)}`;
        document.getElementById('unpaidCount').innerText = unpaidCount;
        document.getElementById('totalUnits').innerText = `${currentUnits} kWh`;

        updateChart(data);
        predictNextMonth(data);
    } catch (e) { console.error("Error fetching bills:", e); }
}

// १३. चार्ट अपडेट करणे
function updateChart(data) {
    const ctx = document.getElementById('consumptionChart').getContext('2d');
    if (consumptionChart) { consumptionChart.destroy(); }
    const sorted = [...data].sort((a, b) => new Date(a.reading_month) - new Date(b.reading_month));
    consumptionChart = new Chart(ctx, {
        type: 'bar', 
        data: {
            labels: sorted.map(b => b.reading_month),
            datasets: [{ label: 'kWh', data: sorted.map(b => b.meter_reading), backgroundColor: 'rgba(79, 70, 229, 0.5)', borderRadius: 5 }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// १४. सर्च आणि फॉर्म सबमिट
if(searchInput) {
    searchInput.oninput = () => {
        const term = searchInput.value.toLowerCase();
        const rows = document.querySelectorAll('#billTableBody tr');
        rows.forEach(row => { row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none'; });
    };
}

billForm.onsubmit = async (e) => {
    e.preventDefault();
    await fetch('http://127.0.0.1:5000/add_bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: document.getElementById('propertySwitcher').value, 
            month: document.getElementById('month').value,
            meter_reading: document.getElementById('reading').value,
            status: document.getElementById('status').value
        })
    });
    modal.classList.add('hidden');
    billForm.reset();
    fetchBills();
};

async function deleteBill(id) {
    if(confirm("Delete record?")) { 
        await fetch(`http://127.0.0.1:5000/delete_bill/${id}`, { method: 'DELETE' }); 
        fetchBills(); 
    }
}

// सुरुवातीला डेटा लोड करा
fetchBills();