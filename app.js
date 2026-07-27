// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Application State
let currentPdfBytes = null;
let cleanLabelPdfBytes = null;
let croppedPdfBytes = null;
let skuData = {};

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const statusBadge = document.getElementById('statusBadge');
const statusText = document.getElementById('statusText');
const cropHeightSlider = document.getElementById('cropHeightSlider');
const heightVal = document.getElementById('heightVal');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const searchBar = document.getElementById('searchBar');
const reportTableBody = document.getElementById('reportTableBody');
const previewGrid = document.getElementById('previewGrid');

// Modal Elements
const customerModal = document.getElementById('customerModal');
const modalTitle = document.getElementById('modalTitle');
const customerList = document.getElementById('customerList');
const closeModal = document.getElementById('closeModal');

// Drag and drop event listeners
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
        handleFile(files[0]);
    } else {
        alert('Please drop a valid PDF file.');
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// Reset logic
resetBtn.addEventListener('click', resetApp);

// Slider height adjustment logic
cropHeightSlider.addEventListener('input', (e) => {
    heightVal.textContent = e.target.value + '%';
});

cropHeightSlider.addEventListener('change', async (e) => {
    if (!cleanLabelPdfBytes) return;
    showLoading('Cropping labels and updating previews...');
    try {
        const cropVal = parseInt(e.target.value, 10);
        croppedPdfBytes = await cropPDF(cleanLabelPdfBytes.slice(0), cropVal);
        await renderPreviews(croppedPdfBytes.slice(0));
        showSuccess('Labels updated successfully!');
    } catch (err) {
        console.error(err);
        showSuccess('Error adjusting crop height.');
    }
});

// Download logic
downloadBtn.addEventListener('click', () => {
    const pdfToDownload = croppedPdfBytes || cleanLabelPdfBytes;
    if (!pdfToDownload) return;
    const blob = new Blob([pdfToDownload], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Amazon_Clean_Shipping_Labels.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Search and filter logic
searchBar.addEventListener('input', () => {
    renderSKUTable(skuData, searchBar.value.trim());
});

// Process uploaded file
async function handleFile(file) {
    resetApp();
    showLoading('Reading PDF file...');
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        currentPdfBytes = new Uint8Array(arrayBuffer);
        
        showLoading('Analyzing pages & compiling SKU report...');
        const parsed = await parsePDF(currentPdfBytes.slice(0));
        skuData = parsed.skuMap;
        
        renderSKUTable(skuData);
        
        showLoading('Filtering out invoices...');
        // Create a new PDF with only label pages
        cleanLabelPdfBytes = await extractLabelPages(currentPdfBytes.slice(0), parsed.labelPageIndexes);
        
        // Default cutoff is 100% (uncropped labels)
        croppedPdfBytes = cleanLabelPdfBytes.slice(0);
        
        showLoading('Generating previews...');
        await renderPreviews(cleanLabelPdfBytes.slice(0));
        
        // Enable inputs & controls
        cropHeightSlider.disabled = false;
        downloadBtn.disabled = false;
        resetBtn.disabled = false;
        searchBar.disabled = false;
        
        const labelCount = parsed.labelPageIndexes.length;
        showSuccess(`Processed ${labelCount} label${labelCount !== 1 ? 's' : ''} and ${Object.keys(skuData).length} unique SKU types!`);
    } catch (err) {
        console.error(err);
        showSuccess('An error occurred while processing the PDF.');
        statusBadge.style.background = 'rgba(239, 68, 68, 0.1)';
        statusBadge.style.borderColor = 'rgba(239, 68, 68, 0.2)';
        statusBadge.style.color = 'var(--danger)';
        statusText.textContent = 'Error: ' + err.message;
    }
}

// Group PDF.js text items into lines based on Y coordinate
function getLinesFromItems(items) {
    const tolerance = 5; // tolerance for group vertical items
    const rows = [];
    for (const item of items) {
        if (!item.str.trim()) continue;
        const y = item.transform[5];
        const x = item.transform[4];
        let added = false;
        for (const row of rows) {
            if (Math.abs(row.y - y) < tolerance) {
                row.items.push({ text: item.str, x });
                added = true;
                break;
            }
        }
        if (!added) {
            rows.push({ y, items: [{ text: item.str, x }] });
        }
    }
    
    rows.sort((a, b) => b.y - a.y);
    
    const lineStrings = [];
    for (const row of rows) {
        row.items.sort((a, b) => a.x - b.x);
        lineStrings.push(row.items.map(it => it.text).join(" "));
    }
    return lineStrings;
}

// Parse PDF pages to identify labels vs invoices and extract SKU/quantity details
async function parsePDF(pdfData) {
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    
    const labelPageIndexes = []; // 0-based indexes for pdfDoc
    const skuMap = {};
    
    // Process each page
    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const lines = getLinesFromItems(textContent.items);
        const fullText = lines.join('\n');
        const fullTextLower = fullText.toLowerCase();
        
        // Identify page type
        const isInvoice = fullTextLower.includes('tax invoice') || 
                          fullTextLower.includes('invoice number') || 
                          fullTextLower.includes('billing address') || 
                          fullTextLower.includes('triplicate for supplier') ||
                          fullTextLower.includes('authorized signatory');
                          
        console.log(`Page ${i} - Classification: ${isInvoice ? 'INVOICE' : 'LABEL'}`);
        
        if (!isInvoice) {
            // It's a label page! Keep track of it.
            labelPageIndexes.push(i - 1); // 0-based for pdf-lib
        } else {
            // It's an invoice page! Extract SKU, Qty, Order ID, and Customer Name
            
            // Extract Order ID: e.g. 408 - 0222694 - 9913167 (handling spacing around hyphens)
            const orderIdRegex = /(\d{3})\s*-\s*(\d{7})\s*-\s*(\d{7})/;
            const orderIdMatch = fullText.match(orderIdRegex);
            const orderId = orderIdMatch ? `${orderIdMatch[1]}-${orderIdMatch[2]}-${orderIdMatch[3]}` : 'Unknown Order ID';
            
            // Extract Customer Name from Billing/Shipping Address (only from right column to avoid matching the Seller name)
            let customerName = 'Unknown Customer';
            const rightColumnItems = textContent.items.filter(item => item.transform[4] > 280);
            const rightColumnLines = getLinesFromItems(rightColumnItems);
            
            for (let j = 0; j < rightColumnLines.length; j++) {
                const lineClean = rightColumnLines[j].toLowerCase().replace(/\s+/g, '');
                if (lineClean.includes('billingaddress') || lineClean.includes('shippingaddress')) {
                    if (j + 1 < rightColumnLines.length) {
                        customerName = rightColumnLines[j + 1].trim();
                        break;
                    }
                }
            }
            
            // 1. Extract SKUs: Look for ASIN ( Seller SKU ) format
            const skuRegex = /[B0-9][A-Z0-9]{9}\s*\(\s*([^)]+)\s*\)/gi;
            const skusFound = [];
            let match;
            while ((match = skuRegex.exec(fullText)) !== null) {
                const rawSku = match[1].trim();
                const cleanSku = rawSku.split(/\s+/).pop();
                skusFound.push(cleanSku);
            }
            
            // 2. Extract Quantities
            const qtyRegex = /(?:₹|Rs\.?)\s*[0-9.,]+\s+(\d+)\s+(?:₹|Rs\.?)\s*[0-9.,]+/gi;
            const qtysFound = [];
            while ((match = qtyRegex.exec(fullText)) !== null) {
                qtysFound.push(parseInt(match[1], 10));
            }
            
            // Map SKUs to quantities and associate with the Customer Name and Order ID
            for (let j = 0; j < skusFound.length; j++) {
                const sku = skusFound[j];
                const qty = qtysFound[j] !== undefined ? qtysFound[j] : 1; // fallback to 1 if no quantity matches
                
                if (!skuMap[sku]) {
                    skuMap[sku] = { qty: 0, orders: 0, customers: [] };
                }
                skuMap[sku].qty += qty;
                skuMap[sku].orders += 1;
                
                // Add customer name and order ID directly from this invoice sheet
                skuMap[sku].customers.push({
                    name: customerName,
                    orderId: orderId
                });
            }
        }
    }
    
    return { labelPageIndexes, skuMap };
}

// Extract only label pages into a new PDF using PDF-lib
async function extractLabelPages(pdfBytes, pageIndexes) {
    const srcDoc = await PDFLib.PDFDocument.load(pdfBytes);
    const newDoc = await PDFLib.PDFDocument.create();
    
    const copiedPages = await newDoc.copyPages(srcDoc, pageIndexes);
    for (const page of copiedPages) {
        newDoc.addPage(page);
    }
    
    return await newDoc.save();
}

// Crop the top portion of the label PDF pages using PDF-lib
async function cropPDF(pdfBytes, cropPercentage) {
    const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    for (const page of pages) {
        const { width, height } = page.getSize();
        const keepRatio = cropPercentage / 100;
        const cropY = height * (1 - keepRatio);
        const cropHeight = height * keepRatio;
        
        page.setCropBox(0, cropY, width, cropHeight);
    }
    
    return await pdfDoc.save();
}

// Render clean label previews on screen
async function renderPreviews(pdfBytes) {
    previewGrid.innerHTML = '';
    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
    const pdf = await loadingTask.promise;
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        
        const card = document.createElement('div');
        card.className = 'preview-card';
        
        const canvasWrapper = document.createElement('div');
        canvasWrapper.className = 'preview-canvas-wrapper';
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Amazon labels are vertical, scale to display nicely
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        canvasWrapper.appendChild(canvas);
        card.appendChild(canvasWrapper);
        
        const info = document.createElement('div');
        info.className = 'preview-info';
        info.innerHTML = `
            <span>Shipping Label</span>
            <span class="page-number">Page ${i}</span>
        `;
        card.appendChild(info);
        previewGrid.appendChild(card);
        
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        await page.render(renderContext).promise;
    }
}

// Render SKU Report Table
function renderSKUTable(data, filterQuery = '') {
    reportTableBody.innerHTML = '';
    const query = filterQuery.toLowerCase();
    
    let totalQty = 0;
    let totalOrders = 0;
    let skuCount = 0;
    
    const sortedSkus = Object.keys(data).sort();
    
    for (const sku of sortedSkus) {
        if (query && !sku.toLowerCase().includes(query)) continue;
        
        const item = data[sku];
        totalQty += item.qty;
        totalOrders += item.orders;
        skuCount++;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="sku-cell" data-sku="${sku}">${sku}</td>
            <td class="qty-cell">${item.qty}</td>
            <td>${item.orders}</td>
        `;
        
        row.querySelector('.sku-cell').addEventListener('click', (e) => {
            const selectedSku = e.target.getAttribute('data-sku');
            showCustomerModal(selectedSku);
        });
        
        reportTableBody.appendChild(row);
    }
    
    if (skuCount > 0) {
        const totalRow = document.createElement('tr');
        totalRow.className = 'total-row';
        totalRow.innerHTML = `
            <td>TOTAL</td>
            <td class="qty-cell">${totalQty}</td>
            <td>${totalOrders}</td>
        `;
        reportTableBody.appendChild(totalRow);
    } else {
        reportTableBody.innerHTML = `
            <tr>
                <td colspan="3">
                    <div class="empty-state">
                        <div class="empty-state-icon">🔍</div>
                        <div>No SKUs match search.</div>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Modal helper controls
closeModal.addEventListener('click', hideModal);
customerModal.addEventListener('click', (e) => {
    if (e.target === customerModal) hideModal();
});

function showCustomerModal(sku) {
    const item = skuData[sku];
    if (!item || !item.customers || item.customers.length === 0) return;
    
    modalTitle.textContent = `Customers for SKU: ${sku}`;
    customerList.innerHTML = '';
    
    item.customers.forEach(cust => {
        const li = document.createElement('li');
        li.className = 'customer-item';
        li.innerHTML = `
            <span class="customer-name">${cust.name}</span>
            <span class="order-id-badge">${cust.orderId}</span>
        `;
        customerList.appendChild(li);
    });
    
    customerModal.classList.add('active');
}

function hideModal() {
    customerModal.classList.remove('active');
}

// Helper styling state setters
function showLoading(text) {
    statusBadge.style.display = 'flex';
    statusBadge.className = 'status-badge loading';
    statusText.textContent = text;
}

// Show success message
function showSuccess(text) {
    statusBadge.style.display = 'flex';
    statusBadge.className = 'status-badge success';
    statusText.textContent = text;
}

// Reset UI
function resetApp() {
    currentPdfBytes = null;
    cleanLabelPdfBytes = null;
    croppedPdfBytes = null;
    skuData = {};
    
    fileInput.value = '';
    statusBadge.style.display = 'none';
    cropHeightSlider.disabled = true;
    cropHeightSlider.value = 100;
    heightVal.textContent = '100%';
    downloadBtn.disabled = true;
    resetBtn.disabled = true;
    searchBar.disabled = true;
    searchBar.value = '';
    
    reportTableBody.innerHTML = `
        <tr>
            <td colspan="3">
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <div>Upload a PDF to view the SKU reports here</div>
                </div>
            </td>
        </tr>
    `;
    
    previewGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; width: 100%;">
            <div class="empty-state-icon">👁️</div>
            <div>Page previews will be generated here</div>
        </div>
    `;
}
