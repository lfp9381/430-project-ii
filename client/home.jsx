const helper = require('./helper.js');
const React = require('react');
const { useState, useEffect } = React;
const { createRoot } = require('react-dom/client');

const handleDomo = (e, onDomoAdded) => {
    e.preventDefault();
    helper.hideError();

    const name = e.target.querySelector('#domoName').value;
    const age = e.target.querySelector('#domoAge').value;
    const food = e.target.querySelector('#domoFood').value;

    if (!name || !age || !food) {
        helper.handleError('All fields are required!');
        return false;
    }

    helper.sendPost(e.target.action, { name, age, food }, onDomoAdded);
    return false;
}

const DomoForm = (props) => {
    return (
        <form id="domoForm"
            onSubmit={(e) => handleDomo(e, props.triggerReload)}
            name="domoForm"
            action="/home"
            method="POST"
            className="domoForm"
        >
            <label htmlFor="name">Name: </label>
            <input id="domoName" type="text" name="name" placeholder="Domo Name" />

            <label htmlFor="food">Fav Food: </label>
            <input id="domoFood" type="text" name="food" placeholder="Domo Favorite Food" />

            <label htmlFor="age">Age: </label>
            <input id="domoAge" type="number" min="0" name="age" />

            <input className="makeDomoSubmit" type="submit" value="Make Domo" />
        </form>
    );
};

const DomoList = (props) => {
    //const [domos, setDomos] = useState(props.domos);
    const { domos: initialDomos, reloadDomos, me, setMe } = props;
    const [domos, setDomos] = useState(initialDomos);

    useEffect(() => {
        const loadDomosFromServer = async () => {
            const response = await fetch('/getDomos');
            const data = await response.json();
            setDomos(data.domos);
        };
        loadDomosFromServer();
    }, [props.reloadDomos]);

    if (domos.length === 0) {
        return (
            <div className="domoList">
                <h3 className="emptyDomo">No Domos yet!</h3>
            </div>
        );
    }

    const domoNodes = domos.flatMap((domo, i) => {
        const isFollowing = props.me?.following?.map(id => id.toString()).includes(domo.owner._id.toString());
        const showFollowButton = props.me && props.me._id.toString() !== domo.owner._id.toString();

        const node = (
            <div key={domo.id} className="domo">
                <img src="/assets/img/domoface.jpeg" alt="domo face" className="domoFace" />

                <h3 className="domoOwner">Posted By: {domo.owner.username}
                    {showFollowButton && (
                        <FollowButton
                            ownerId={domo.owner._id.toString()}
                            isFollowing={isFollowing}
                            onUpdate={setMe}
                            username={domo.owner.username}
                        />
                    )}</h3>

                <h3 className="domoName">Name: {domo.name}</h3>
                <h3 className="domoAge">Age: {domo.age}</h3>
                <h3 className="domoFood">Favorite Food: {domo.food}</h3>
            </div>
        );

        // Displays an 'ad' after every 5 posts
        if ((i + 1) % 5 === 0) {
            return [
                node,
                <div key={`placeholder-${i}`} className="domo">
                    <h3 className="domoName">placeholder (ad)</h3>
                </div>
            ];
        }

        return node;
    });

    return (
        <div className="domoList">
            {domoNodes}
        </div>
    );
};

function FollowButton({ ownerId, isFollowing, onUpdate, username }) {
    const handleToggle = async () => {
        const route = isFollowing ? '/unfollow' : '/follow';
        try {
            const res = await fetch(route, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetId: ownerId }),
            });

            if (res.ok) {
                // Re-fetch /me to update following list
                const updatedMe = await fetch('/me').then(r => r.json());
                onUpdate(updatedMe);
            } else {
                console.error('Action failed');
            }
        } catch (err) {
            console.error('Error toggling follow', err);
        }
    };

    return (
        <button onClick={handleToggle}>
            {isFollowing ? `Unfollow ${username}` : `Follow ${username}`}
        </button>
    );
}

const App = () => {
    const [reloadDomos, setReloadDomos] = useState(false);
    const [me, setMe] = useState(null);

    useEffect(() => {
        const fetchMe = async () => {
            try {
                const res = await fetch('/me');
                const data = await res.json();
                setMe(data);
            } catch (err) {
                console.error('Failed to load current user', err);
            }
        };

        fetchMe();
    }, []);

    return (
        <div>
            <div id="makeDomo">
                <DomoForm triggerReload={() => setReloadDomos(!reloadDomos)} />
            </div>
            <div id="domos">
                <DomoList domos={[]} reloadDomos={reloadDomos} me={me} setMe={setMe} />
            </div>
        </div>
    );
};

const init = () => {
    const root = createRoot(document.getElementById('app'));
    root.render(<App />);
};

window.onload = init;