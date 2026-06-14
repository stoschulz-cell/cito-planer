app.post('/api/auth/login', async (req, res) => {
    const { name, passwort } = req.body;
    const data = await db.collection('daten').findOne({ id: "main" });
    
    // Hardcoded Admin-Login für dich
    if (name === "Admin" && passwort === "Admin123") {
        return res.json({ success: true, role: 'planer' });
    }

    const user = data.mitarbeiterListe.find(m => m.name.toLowerCase() === name.toLowerCase());
    if (user && user.passwort === passwort) {
        const istPlaner = data.planerListe?.includes(user.name);
        res.json({ success: true, role: istPlaner ? 'planer' : 'mitarbeiter' });
    } else {
        res.status(401).json({ error: "Login fehlgeschlagen" });
    }
});