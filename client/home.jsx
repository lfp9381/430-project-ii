const helper = require('./helper.js');
const React = require('react');
const { useState, useEffect } = React;
const { createRoot } = require('react-dom/client');

function shuffleWithFollowBias(posts, me, followWeight = 0.6) {
    if (!me || !me.following) return posts;

    // Remove any posts without creator
    posts = posts.filter(p => p.creator && p.creator._id);

    const followingSet = new Set(me.following.map(id => id.toString()));
    const followed = posts.filter(p => followingSet.has(p.creator._id.toString()));
    const unfollowed = posts.filter(p => !followingSet.has(p.creator._id.toString()));

    const result = [];
    const total = posts.length;

    for (let i = 0; i < total; i++) {
        const pickFollowed = Math.random() < followWeight;

        if (pickFollowed && followed.length > 0) {
            result.push(followed.splice(Math.floor(Math.random() * followed.length), 1)[0]);
        } else if (unfollowed.length > 0) {
            result.push(unfollowed.splice(Math.floor(Math.random() * unfollowed.length), 1)[0]);
        } else if (followed.length > 0) {
            result.push(followed.splice(Math.floor(Math.random() * followed.length), 1)[0]);
        }
    }

    return result;
}

const handlePost = (e, onPostAdded) => {
    e.preventDefault();
    helper.hideError();

    const content = e.target.querySelector('#postContent').value;

    if (!content) {
        helper.handleError('All fields are required!');
        return false;
    }

    helper.sendPost(e.target.action, { content }, (response) => {
        if (response._id) {
            onPostAdded(response);
        }
    });

    return false;
};

const PostForm = (props) => {
    return (
        <form id="postForm"
            onSubmit={(e) => handlePost(e, props.onNewPost)}
            name="postForm"
            action="/home"
            method="POST"
            className="postForm"
        >
            <label htmlFor="content">Content: </label>
            <input id="postContent" type="text" name="content" placeholder="Post Content" />

            <input className="makePostSubmit" type="submit" value="Make Post" />
        </form>
    );
};

const PostList = (props) => {
    const { posts, newPosts, me, setMe, activeTab } = props;

    const [basePosts, setBasePosts] = useState([]);
    const [hasShuffled, setHasShuffled] = useState(false);

    const displayPosts = [...newPosts, ...posts];

    if (displayPosts.length === 0) {
        return (
            <div className="postList">
                <h3 className="emptyPost">No posts yet!</h3>
            </div>
        );
    }

    // Mapping post data to displayed sections
    const postNodes = displayPosts.flatMap((post, i) => {

        // Check for any broken posts (posts without creator)
        if (!post.creator) {
            console.error("Post missing creator: ", post);
            return null;
        }

        const isFollowing = props.me?.following?.map(id => id.toString()).includes(post.creator._id.toString());
        const showFollowButton = props.me && props.me._id.toString() !== post.creator._id.toString();

        const node = (
            <div key={post._id} className="post">
                <img src="/assets/img/domoface.jpeg" alt="domo face" className="domoFace" />

                <h3 className="postCreator">Posted By: {post.creator.username}
                    {showFollowButton && (
                        <FollowButton
                            creatorId={post.creator._id.toString()}
                            isFollowing={isFollowing}
                            onUpdate={setMe}
                            username={post.creator.username}
                        />
                    )}</h3>

                <h3 className="postContent">{post.content}</h3>
            </div>
        );

        // Displays an 'ad' after every 5 posts
        if ((i + 1) % 5 === 0) {
            return [
                node,
                <div key={`placeholder-${i}`} className="post">
                    <h3 className="postContent">placeholder (ad)</h3>
                </div>
            ];
        }

        return node;
    });

    return (
        <div className="postList">
            {postNodes}
        </div>
    );
};

function FollowButton({ creatorId, isFollowing, onUpdate, username }) {
    const handleToggle = async () => {
        const route = isFollowing ? '/unfollow' : '/follow';
        try {
            const res = await fetch(route, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetId: creatorId }),
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
    const [reloadPosts, setReloadPosts] = useState(false);
    const [me, setMe] = useState(null);
    const [newPosts, setNewPosts] = useState([]);

    // Home and following tabs
    const [activeTab, setActiveTab] = useState('home');
    const [homePosts, setHomePosts] = useState([]);
    const [followingPosts, setFollowingPosts] = useState([]);

    useEffect(() => {
        const loadUserAndPosts = async () => {
            try {
                const res = await fetch('/me');
                const meData = await res.json();
                setMe(meData);

                const postRes = await fetch('/getPosts');
                const data = await postRes.json();
                const allPosts = data.posts;

                // Shuffle Home tab (60% bias)
                setHomePosts(shuffleWithFollowBias(allPosts, meData, 0.6));

                // Shuffle Following tab (100% bias)
                const followingSet = new Set(meData.following.map(id => id.toString()));
                const followingOnly = allPosts.filter(p => p.creator && followingSet.has(p.creator._id.toString()));
                setFollowingPosts(shuffleWithFollowBias(followingOnly, meData, 1.0));
            } catch (err) {
                console.error(err);
            }
        };

        loadUserAndPosts();
    }, []);

    return (
        <div>
            <div className="tabs">
                <button
                    className={activeTab === 'home' ? 'active' : ''}
                    onClick={() => setActiveTab('home')}
                >
                    Home
                </button>
                <button
                    className={activeTab === 'following' ? 'active' : ''}
                    onClick={() => setActiveTab('following')}
                >
                    Following
                </button>
            </div>

            <div id="makePost">
                <PostForm onNewPost={(post) => setNewPosts(prev => [post, ...prev])} />
            </div>

            <div id="posts">
                <PostList
                    posts={activeTab === 'following' ? followingPosts : homePosts}
                    reloadPosts={reloadPosts}
                    newPosts={
                        activeTab === 'following'
                            ? newPosts.filter(
                                p => me.following.includes(p.creator._id) || p.creator._id === me._id
                            )
                            : newPosts
                    }
                    me={me}
                    setMe={setMe}
                    activeTab={activeTab}
                />
            </div>
        </div>
    );
};

const init = () => {
    const root = createRoot(document.getElementById('app'));
    root.render(<App />);
};

window.onload = init;