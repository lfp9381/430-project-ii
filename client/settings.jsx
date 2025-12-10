const React = require('react');
const { useState, useEffect } = React;
const { createRoot } = require('react-dom/client');
const { handleError, sendPost } = require('./helper.js');

const SettingsApp = ({ me }) => {
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [newPass2, setNewPass2] = useState('');
    const [message, setMessage] = useState('');

    // Initialize premium mode from localStorage
    const [isPremium, setIsPremium] = useState(
        JSON.parse(localStorage.getItem('premiumMode') || 'false')
    );

    // Ensure global variable is synced
    useEffect(() => {
        window.premiumMode = isPremium;
    }, [isPremium]);

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (!oldPass || !newPass || !newPass2) {
            handleError('All fields are required');
            return;
        }

        if (newPass !== newPass2) {
            handleError('New passwords do not match');
            return;
        }

        try {
            await sendPost('/settings/password', { oldPass, newPass, newPass2 }, (res) => {
                if (res.message) {
                    setMessage(res.message);
                    setOldPass('');
                    setNewPass('');
                    setNewPass2('');
                }
            });
        } catch (err) {
            handleError('Failed to change password');
            console.error(err);
        }
    };

    const togglePremiumMode = () => {
        const newMode = !isPremium;
        setIsPremium(newMode);

        // Persist globally
        window.premiumMode = newMode;
        localStorage.setItem('premiumMode', JSON.stringify(newMode));

        // Notify components listening for changes
        window.dispatchEvent(new CustomEvent('premiumModeChanged', { detail: newMode }));
    };

    return (
        <div>
            <h1>Settings</h1>
            <section id="settings-password">
                <h2>Change Password</h2>
                <form onSubmit={handleChangePassword}>
                    <label>
                        Current Password:
                        <input
                            type="password"
                            value={oldPass}
                            onChange={(e) => setOldPass(e.target.value)}
                            required
                        />
                    </label>
                    <br />
                    <label>
                        New Password:
                        <input
                            type="password"
                            value={newPass}
                            onChange={(e) => setNewPass(e.target.value)}
                            required
                        />
                    </label>
                    <br />
                    <label>
                        Confirm New Password:
                        <input
                            type="password"
                            value={newPass2}
                            onChange={(e) => setNewPass2(e.target.value)}
                            required
                        />
                    </label>
                    <br />
                    <button type="submit">Change Password</button>
                </form>

                {message && <p id="settingsMessage">{message}</p>}
            </section>

            <section id="premium-toggle">
                <h2>Premium Mode</h2>
                <label>
                    <input
                        type="checkbox"
                        checked={isPremium}
                        onChange={togglePremiumMode}
                    />
                    Enable Premium Mode (no ads)
                </label>
            </section>
        </div>
    );
};

const init = () => {
    const rootEl = document.getElementById('settingsRoot');
    const meScript = document.getElementById('user-data');
    const me = meScript ? JSON.parse(meScript.textContent) : null;

    if (!me) {
        console.error('No user data found!');
        return;
    }

    const root = createRoot(rootEl);
    root.render(<SettingsApp me={me} />);
};

window.onload = init;