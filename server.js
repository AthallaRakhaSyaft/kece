require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Konfigurasi penyimpanan file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

// Konfigurasi transporter Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Route untuk mengirim email lamaran kerja
app.post('/send-email', upload.single('resume'), async (req, res) => {
    try {
        const { fullName, email, phone, coverLetter, jobTitle } = req.body;
        const resumePath = req.file ? req.file.path : null;

        if (!fullName || !email || !phone || !jobTitle) {
            return res.status(400).json({ success: false, message: "Harap isi semua bidang yang wajib!" });
        }

        // Tambahkan logo (gunakan URL online atau lampiran)
        const logoUrl = 'https://example.com/logo.jpg'; // Ganti dengan URL logo online yang valid
        const logoPath = 'logo.jpg'; // Ganti dengan path logo lokal jika ingin melampirkannya

        const mailOptions = {
            from: `"HR Team" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Konfirmasi Lamaran Kerja",
            html: `
                <div style="text-align: center;">
                    <img src="cid:logo" alt="Company Logo" width="150" style="margin-bottom: 20px;">
                </div>
                <h3>Halo ${fullName},</h3>
                <p>Terima kasih telah melamar pekerjaan <b>${jobTitle}</b>.</p>
                <p>Berikut adalah detail lamaran Anda:</p>
                <ul>
                    <li><b>Email:</b> ${email}</li>
                    <li><b>Telepon:</b> ${phone}</li>
                    <li><b>Surat Lamaran:</b> ${coverLetter || 'Tidak ada surat lamaran'}</li>
                </ul>
                <p>Salam,<br><b>Tim HR</b></p>
            `,
            attachments: [
                ...(resumePath ? [{ filename: path.basename(resumePath), path: resumePath }] : []),
                {   // Menambahkan logo sebagai attachment inline
                    filename: 'logo.jpg',
                    path: logoPath,
                    cid: 'logo' // "cid" ini akan digunakan sebagai referensi dalam HTML
                }
            ]
        };

        await transporter.sendMail(mailOptions);

        // Hapus file resume setelah email dikirim untuk mencegah akumulasi file
        if (resumePath) {
            setTimeout(() => fs.unlinkSync(resumePath), 60000);
        }

        res.json({ success: true, message: "Email terkirim!" });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, message: "Gagal mengirim email" });
    }
});

// Jalankan server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
