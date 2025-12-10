const helper = require('./helper.js');
const React = require('react');
const { useState, useEffect } = React;
const { createRoot } = require('react-dom/client');

const shuffleWithFollowBias = (posts, me, followWeight = 0.6) => {
    if (!me || !me.following) return posts;

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
};

const handlePost = (e, onPostAdded) => {
    e.preventDefault();

    const input = e.target.querySelector('#postContent');
    const content = input.value;

    if (!content) {
        helper.handleError('All fields are required!');
        return false;
    }

    helper.sendPost(e.target.action, { content }, (response) => {
        if (response._id) {
            onPostAdded(response);
            input.value = '';
        }
    });

    return false;
};

const PostForm = (props) => (
    <form id="postForm"
        onSubmit={(e) => handlePost(e, props.onNewPost)}
        name="postForm"
        action="/home"
        method="POST"
        className="postForm"
    >
        <input id="postContent" type="text" name="content" placeholder=" Shout into the void!" />
        <input className="makePostSubmit" type="submit" value="Post" />
    </form>
);

const PostList = (props) => {
    const { posts, newPosts, me, setMe, activeTab, blockedSet, setBlockedSet, updateFollowingPosts, allPosts } = props;

    const filteredNewPosts = activeTab === 'following' && me
        ? newPosts.filter(p => me.following.includes(p.creator._id) || p.creator._id === me._id)
        : newPosts;

    const displayPosts = [...filteredNewPosts, ...posts]
        .filter((p, i, arr) => p && arr.findIndex(x => x._id === p._id) === i);

    const [isPremium, setIsPremium] = useState(
        JSON.parse(localStorage.getItem('premiumMode') || 'false')
    );

    useEffect(() => {
        const handler = (e) => setIsPremium(e.detail);
        window.addEventListener('premiumModeChanged', handler);
        return () => window.removeEventListener('premiumModeChanged', handler);
    }, []);

    if (displayPosts.length === 0) {
        return (
            <div className="postList">
                <h3 className="emptyPost">No posts yet!</h3>
            </div>
        );
    }

    const postNodes = displayPosts.flatMap((post, i) => {
        if (!post.creator) {
            console.error("Post missing creator: ", post);
            return null;
        }

        const isFollowing = me?.following?.map(id => id.toString()).includes(post.creator._id.toString());
        const showFollowButton = me && me._id.toString() !== post.creator._id.toString();
        const showBlockButton = me && me._id.toString() !== post.creator._id.toString();
        const isBlocked = blockedSet?.has(post.creator._id.toString());
        const postContent = isBlocked ? "Blocked message" : post.content;
        const postContentClass = isBlocked ? "blockedPostContent" : "postContent";

        const node = (
            <div key={post._id} className="post">
                <img src="/assets/img/profile-icon.jpg" alt="profile icon" className="profileIcon" />

                <h3 className="postCreator">@{post.creator.username} says:
                    {showBlockButton && (
                        <BlockButton
                            creatorId={post.creator._id.toString()}
                            blockedSet={blockedSet}
                            setBlockedSet={setBlockedSet}
                            me={me}
                            onUpdate={setMe}
                            username={post.creator.username}
                            className="block-btn"
                        />
                    )}
                    {showFollowButton && (
                        <FollowButton
                            creatorId={post.creator._id.toString()}
                            isFollowing={isFollowing}
                            onUpdate={setMe}
                            username={post.creator.username}
                            className="follow-btn"
                            updateFollowingPosts={updateFollowingPosts}
                            allPosts={allPosts}
                        />
                    )}
                </h3>

                <h3 className={postContentClass}>{postContent}</h3>
            </div>
        );

        // Only show ads if not in premium mode
        if ((i + 1) % 5 === 0 && !isPremium) {
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

const FollowButton = ({ creatorId, isFollowing, onUpdate, username, className, updateFollowingPosts, allPosts }) => {
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

                if (updateFollowingPosts && allPosts) {
                    updateFollowingPosts(updatedMe, allPosts);
                }
            } else {
                console.error('Follow/unfollow action failed!');
            }
        } catch (err) {
            console.error('Error toggling follow!', err);
        }
    };

    const dynamicClass = `${className || ''} ${isFollowing ? 'unfollow' : 'follow'}`;

    return (
        <button onClick={handleToggle} className={dynamicClass}>
            {isFollowing ? `Unfollow` : `Follow`}
        </button>
    );
};

const BlockButton = ({ creatorId, blockedSet, setBlockedSet, me, onUpdate, username, className }) => {
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
                setBlockedSet(prev => {
                    const newSet = new Set(prev);
                    if (isBlocked) {
                        newSet.delete(creatorId);
                    } else {
                        newSet.add(creatorId);
                    }
                    return newSet;
                });

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
                console.error('Block/unblock action failed!');
            }
        } catch (err) {
            console.error('Error toggling block!', err);
        }
    };

    const dynamicClass = `${className || ''} ${isBlocked ? 'unblock' : 'block'}`;

    return (
        <button onClick={handleToggle} className={dynamicClass}>
            {isBlocked ? `Unblock` : `Block`}
        </button>
    );
};

const App = () => {
    const [reloadPosts, setReloadPosts] = useState(false);
    const [me, setMe] = useState(null);
    const [newPosts, setNewPosts] = useState([]);

    const [activeTab, setActiveTab] = useState('home');
    const [homePosts, setHomePosts] = useState([]);
    const [followingPosts, setFollowingPosts] = useState([]);

    const [blockedSet, setBlockedSet] = useState(new Set(me?.blocking || []));

    const updateFollowingPosts = (meData, allPosts) => {
        if (!meData) return;

        const followingSet = new Set(meData.following.map(id => id.toString()));
        const followingOnly = allPosts.filter(
            p => p.creator && followingSet.has(p.creator._id.toString())
        );

        setFollowingPosts(shuffleWithFollowBias(followingOnly, meData, 1.0));
    };

    useEffect(() => {
        const loadUserAndPosts = async () => {
            try {
                const res = await fetch('/me');
                const meData = await res.json();
                setMe(meData);

                const blockedSet = new Set(meData.blocking || []);
                setBlockedSet(blockedSet);

                const postRes = await fetch('/getPosts');
                const data = await postRes.json();
                const allPosts = data.posts;

                const unblockedPosts = allPosts.filter(
                    p => p.creator && !blockedSet.has(p.creator._id.toString())
                );

                setHomePosts(shuffleWithFollowBias(unblockedPosts, meData, 0.6));
                updateFollowingPosts(meData, unblockedPosts);
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
                    newPosts={newPosts}
                    me={me}
                    setMe={setMe}
                    activeTab={activeTab}
                    blockedSet={blockedSet}
                    setBlockedSet={setBlockedSet}
                    updateFollowingPosts={updateFollowingPosts}
                    allPosts={[...homePosts, ...followingPosts, ...newPosts]}
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