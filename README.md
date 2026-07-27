# Amazon Label Cropper & SKU-wise Report Analyzer

A secure, high-performance, and **100% client-side web tool** designed for Amazon Sellers to streamline their packaging and shipping workflow. 

This tool allows you to upload your bundled Amazon Shipping Label + Tax Invoice PDFs, automatically separates and discards the invoice pages, crops/resizes the shipping labels for thermal printers, and compiles a clean, real-time SKU-wise summary report of your daily orders.

---

## 🚀 Key Features

* **Invoice Auto-Exclusion**: Automatically identifies and filters out Tax Invoice pages (which are text-selectable), leaving only the clean shipping labels in the final downloadable PDF.
* **SKU-wise Summary Report**: Parses the invoice sheets to extract Amazon ASINs/Seller SKUs (e.g., `SD-MIX-1000`) and order quantities (`Qty`) to generate a dispatch summary table.
* **Customer List Popup**: Click on any SKU name in the report table to open a popup showing a complete list of customers who ordered that item along with their Order IDs.
* **Robust Coordinate Filtering**: Uses PDF coordinate checking to isolate and display only customer names, preventing seller business names from appearing in reports.
* **Dynamic Cutoff Height**: Crop label heights dynamically using an interactive slider (useful for adjusting margins for thermal barcode printing).
* **100% Client-Side (Secure)**: All PDF processing, parsing, and rendering are done directly inside your browser. No files are uploaded to any server, keeping your customer data fully private and secure.

---

## 🛠️ Technology Stack

* **Frontend**: Vanilla HTML5, CSS3, ES6 JavaScript
* **Theme**: Glassmorphism dark-theme styled with **Outfit** and **Plus Jakarta Sans** typography
* **PDF Engine**:
  * [pdf-lib](https://github.com/Hopding/pdf-lib) (For page extraction and label cropping)
  * [pdf.js](https://mozilla.github.io/pdf.js/) (For in-browser PDF rendering and text parsing)

---

## 📦 Deployment to GitHub Pages

Since this application runs entirely in the browser and requires no server-side backend (no Node.js, PHP, or Python), it is perfectly suited for **GitHub Pages**.

1. **Initialize Git**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
2. **Add Remote & Push**:
   ```bash
   git remote add origin https://github.com/gopalvaghasiya/amazon-label-cropper-sku-analyzer.git
   git branch -M main
   git push -u origin main
   ```
3. **Configure Pages**:
   * Navigate to your repository settings on GitHub.
   * Go to the **Pages** tab on the left sidebar.
   * Under **Build and deployment**, select **Deploy from a branch**.
   * Set the branch to `main` and the folder to `/ (root)`, then click **Save**.
   * Your site will be live at `https://gopalvaghasiya.github.io/amazon-label-cropper-sku-analyzer/` within a couple of minutes!

---

## 💻 Running Locally

You don't need any complex setup to run this tool locally. Just double-click the `index.html` file to open it in your browser, or serve it using XAMPP/Apache or the Live Server extension in VS Code.

---

## 🛡️ License

Distributed under the MIT License. See `LICENSE` for more information.
