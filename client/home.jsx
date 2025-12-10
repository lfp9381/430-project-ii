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

    const input = e.target.querySelector('#postContent');
    const content = input.value;

    if (!content) {
        helper.handleError('All fields are required!');
        return false;
    }

    helper.sendPost(e.target.action, { content }, (response) => {
        if (response._id) {
            onPostAdded(response);
            input.value = ''; // Clears input after posting
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
            {/* <label htmlFor="content"></label> */}
            <input id="postContent" type="text" name="content" placeholder="Shout into the void!" />

            <input className="makePostSubmit" type="submit" value="Post" />
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

        // Following
        const isFollowing = props.me?.following?.map(id => id.toString()).includes(post.creator._id.toString());
        const showFollowButton = props.me && props.me._id.toString() !== post.creator._id.toString();

        // Blocking
        const showBlockButton = props.me && props.me._id.toString() !== post.creator._id.toString();
        const isBlocked = props.blockedSet?.has(post.creator._id.toString());
        const postContent = isBlocked ? "Post from blocked user" : post.content;

        const node = (
            <div key={post._id} className="post">
                <img src="/assets/img/profile-icon.jpg" alt="profile icon" className="profileIcon" />

                <h3 className="postCreator">@{post.creator.username} says:
                    {showFollowButton && (
                        <FollowButton
                            creatorId={post.creator._id.toString()}
                            isFollowing={isFollowing}
                            onUpdate={setMe}
                            username={post.creator.username}
                            className="follow-btn"
                        />
                    )}
                    {showBlockButton && (
                        <BlockButton
                            creatorId={post.creator._id.toString()}
                            blockedSet={props.blockedSet}
                            setBlockedSet={props.setBlockedSet}
                            me={props.me}
                            onUpdate={props.setMe}
                            username={post.creator.username}
                        />
                    )}
                </h3>

                <h3 className="postContent">{postContent}</h3>
            </div>
        );

        // Displays an 'ad' after every 5 posts
        if ((i + 1) % 5 === 0) {
            return [
                node,
                <div key={`placeholder-${i}`} className="post ad">
                    <h3 className="postContent adContent">This is an advertisement!</h3>
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

function FollowButton({ creatorId, isFollowing, onUpdate, username, className }) {
    const handleToggle = async () => {
        const route = isFollowing ? '/unfollow' : '/follow';
        try {
            const res = await fetch(route, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetId: creatorId }),
            });

            if (res.ok) {
                const updatedMe = await fetch('/me').then(r => r.json());
                onUpdate(updatedMe);
            } else {
                console.error('Action failed');
            }
        } catch (err) {
            console.error('Error toggling follow', err);
        }
    };

    const dynamicClass = `${className || ''} ${isFollowing ? 'unfollow' : 'follow'}`;

    return (
        <button onClick={handleToggle} className={dynamicClass}>
            {isFollowing ? `Unfollow` : `Follow`}
        </button>
    );
}

function BlockButton({ creatorId, blockedSet, setBlockedSet, me, onUpdate, username }) {
    const isBlocked = blockedSet.has(creatorId);

    const handleToggle = async () => {
        try {
            const route = isBlocked ? '/unblock' : '/block';
            const res = await fetch(route, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetId: creatorId }),
            });

            if (res.ok) {
                // Temporarily update the blocked set for this session
                setBlockedSet(prev => {
                    const newSet = new Set(prev);
                    if (isBlocked) {
                        newSet.delete(creatorId);
                    } else {
                        newSet.add(creatorId);
                    }
                    return newSet;
                });

                // If blocking, unfollow this account
                if (!isBlocked && me.following.includes(creatorId)) {
                    const unfollowRes = await fetch('/unfollow', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ targetId: creatorId }),
                    });
                    if (unfollowRes.ok) {
                        const updatedMe = await fetch('/me').then(r => r.json());
                        onUpdate(updatedMe);
                    }
                }

            } else {
                console.error('Block/unblock action failed');
            }
        } catch (err) {
            console.error('Error toggling block', err);
        }
    };

    return (
        <button onClick={handleToggle} className={`block-btn ${isBlocked ? 'unblock' : 'block'}`}>
            {isBlocked ? `Unblock` : `Block`}
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

    // Blocking
    const [blockedSet, setBlockedSet] = useState(new Set(me?.blocking || []));

    useEffect(() => {
        const loadUserAndPosts = async () => {
            try {
                // Fetches current user info
                const res = await fetch('/me');
                const meData = await res.json();
                setMe(meData);

                // Blocked set
                const blockedSet = new Set(meData.blocking || []);
                setBlockedSet(blockedSet);

                // Fetches all posts
                const postRes = await fetch('/getPosts');
                const data = await postRes.json();
                const allPosts = data.posts;

                // Filters blocked user posts
                const unblockedPosts = allPosts.filter(
                    p => p.creator && !blockedSet.has(p.creator._id.toString())
                );

                // Shuffles home tab posts with 60% bias towards followed users (pushes them to top)
                setHomePosts(shuffleWithFollowBias(unblockedPosts, meData, 0.6));

                // Shuffles following tab (exclusively consisting of followed accounts - 100% bias)
                const followingSet = new Set(meData.following.map(id => id.toString()));
                const followingOnly = unblockedPosts.filter(
                    p => p.creator && followingSet.has(p.creator._id.toString())
                );
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
                    className={activeTab === 'home' ? 'active tabButton' : 'tabButton'}
                    onClick={() => setActiveTab('home')}
                >
                    Home
                </button>
                <button
                    className={activeTab === 'following' ? 'active tabButton' : 'tabButton'}
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
                    blockedSet={blockedSet}
                    setBlockedSet={setBlockedSet}
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