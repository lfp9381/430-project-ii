const helper = require('./helper.js');
const React = require('react');
const { useState, useEffect } = React;
const { createRoot } = require('react-dom/client');

const handlePost = (e, onPostAdded) => {
    e.preventDefault();
    helper.hideError();

    const content = e.target.querySelector('#postContent').value;

    if (!content) {
        helper.handleError('All fields are required!');
        return false;
    }

    helper.sendPost(e.target.action, { content }, onPostAdded);
    return false;
}

const PostForm = (props) => {
    return (
        <form id="postForm"
            onSubmit={(e) => handlePost(e, props.triggerReload)}
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
    //const [posts, setPosts] = useState(props.posts);
    const { posts: initialPosts, reloadPosts, me, setMe } = props;
    const [posts, setPosts] = useState(initialPosts);

    useEffect(() => {
        const loadPostsFromServer = async () => {
            const response = await fetch('/getPosts');
            const data = await response.json();
            setPosts(data.posts);
        };
        loadPostsFromServer();
    }, [props.reloadPosts]);

    if (posts.length === 0) {
        return (
            <div className="postList">
                <h3 className="emptyPost">No posts yet!</h3>
            </div>
        );
    }

    const postNodes = posts.flatMap((post, i) => {

        if (!post.creator) {
            console.error("Post missing creator:", post);
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
            <div id="makePost">
                <PostForm triggerReload={() => setReloadPosts(!reloadPosts)} />
            </div>
            <div id="posts">
                <PostList posts={[]} reloadPosts={reloadPosts} me={me} setMe={setMe} />
            </div>
        </div>
    );
};

const init = () => {
    const root = createRoot(document.getElementById('app'));
    root.render(<App />);
};

window.onload = init;