import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, API } from "@/App";
import axios from "axios";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageSquare, MoreVertical, Trash2, Send, User } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const API_BASE = process.env.REACT_APP_BACKEND_URL;

// Boxing Glove SVG Icon
const GloveIcon = ({ active, size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`glove-icon transition-all ${active ? "active" : ""}`}
  >
    <path
      d="M12 2C8.5 2 5.5 4.5 5.5 8C5.5 10 6.5 11.5 7.5 12.5L4 20C4 20 6 22 12 22C18 22 20 20 20 20L16.5 12.5C17.5 11.5 18.5 10 18.5 8C18.5 4.5 15.5 2 12 2Z"
      fill={active ? "#dc2626" : "#525252"}
      stroke={active ? "#dc2626" : "#525252"}
      strokeWidth="1.5"
    />
    <path
      d="M8.5 7C8.5 6 9.5 5 10.5 5H13.5C14.5 5 15.5 6 15.5 7V8C15.5 9 14.5 10 13.5 10H10.5C9.5 10 8.5 9 8.5 8V7Z"
      fill={active ? "#991b1b" : "#404040"}
    />
  </svg>
);

export default function PostCard({ post, onUpdate, onDelete }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [koAnimating, setKoAnimating] = useState(false);

  const isOwner = user?.id === post.user_id;
  const hasGloved = post.gloves?.includes(user?.id);
  const hasKOd = post.kos?.includes(user?.id);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const response = await axios.get(`${API}/posts/${post.id}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleToggleComments = () => {
    if (!showComments && comments.length === 0) {
      fetchComments();
    }
    setShowComments(!showComments);
  };

  const handleGlove = async () => {
    try {
      const response = await axios.post(`${API}/posts/${post.id}/glove`);
      const updatedPost = {
        ...post,
        gloves: response.data.action === "added"
          ? [...post.gloves, user.id]
          : post.gloves.filter((id) => id !== user.id),
      };
      onUpdate(updatedPost);
    } catch (error) {
      toast.error("Failed to update reaction");
    }
  };

  const handleKO = async () => {
    try {
      setKoAnimating(true);
      const response = await axios.post(`${API}/posts/${post.id}/ko`);
      const updatedPost = {
        ...post,
        kos: response.data.action === "added"
          ? [...post.kos, user.id]
          : post.kos.filter((id) => id !== user.id),
      };
      onUpdate(updatedPost);
      setTimeout(() => setKoAnimating(false), 500);
    } catch (error) {
      toast.error("Failed to update reaction");
      setKoAnimating(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const response = await axios.post(`${API}/posts/${post.id}/comments`, {
        content: newComment.trim(),
      });
      setComments([response.data, ...comments]);
      setNewComment("");
      onUpdate({ ...post, comment_count: post.comment_count + 1 });
    } catch (error) {
      toast.error("Failed to add comment");
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await axios.delete(`${API}/comments/${commentId}`);
      setComments(comments.filter((c) => c.id !== commentId));
      onUpdate({ ...post, comment_count: post.comment_count - 1 });
    } catch (error) {
      toast.error("Failed to delete comment");
    }
  };

  const handleDeletePost = async () => {
    try {
      await axios.delete(`${API}/posts/${post.id}`);
      onDelete(post.id);
      toast.success("Post deleted");
    } catch (error) {
      toast.error("Failed to delete post");
    }
  };

  const getAvatarUrl = (photoUrl) => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith("http")) return photoUrl;
    return `${API_BASE}${photoUrl}`;
  };

  return (
    <div className="post-card bg-fight-charcoal border border-fight-concrete rounded-sm" data-testid={`post-${post.id}`}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <Link to={`/profile/${post.user_id}`} className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border border-fight-concrete">
            <AvatarImage src={getAvatarUrl(post.user_photo)} />
            <AvatarFallback className="bg-fight-black text-fight-red font-anton">
              {post.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-white font-barlow font-semibold hover:text-fight-red transition-colors">
              {post.username}
            </div>
            <div className="text-gray-500 text-sm font-barlow">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </div>
          </div>
        </Link>

        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-gray-500 hover:text-white p-2" data-testid="post-menu-trigger">
                <MoreVertical size={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-fight-charcoal border-fight-concrete">
              <DropdownMenuItem
                onClick={() => navigate(`/profile/${post.user_id}`)}
                className="cursor-pointer text-white focus:bg-fight-concrete focus:text-white"
                data-testid="view-profile-btn"
              >
                <User size={16} className="mr-2" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDeletePost}
                className="cursor-pointer text-fight-red focus:bg-fight-concrete focus:text-fight-red"
                data-testid="delete-post-btn"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {!isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-gray-500 hover:text-white p-2" data-testid="post-menu-trigger">
                <MoreVertical size={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-fight-charcoal border-fight-concrete">
              <DropdownMenuItem
                onClick={() => navigate(`/profile/${post.user_id}`)}
                className="cursor-pointer text-white focus:bg-fight-concrete focus:text-white"
                data-testid="view-profile-btn"
              >
                <User size={16} className="mr-2" />
                View Profile
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Caption */}
      {post.caption && (
        <div className="px-4 pb-4">
          <p className="text-gray-200 font-barlow whitespace-pre-wrap">{post.caption}</p>
        </div>
      )}

      {/* Media */}
      {post.media_url && (
        <div className="video-container border-t border-b border-fight-concrete">
          {post.media_type === "video" ? (
            <video
              src={`${API_BASE}${post.media_url}`}
              controls
              className="w-full"
              data-testid="post-video"
            />
          ) : (
            <img
              src={`${API_BASE}${post.media_url}`}
              alt=""
              className="w-full"
              data-testid="post-image"
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-4 flex items-center gap-6">
        {/* Glove (Like) */}
        <button
          onClick={handleGlove}
          className="flex items-center gap-2 group glove-tap"
          data-testid="glove-btn"
        >
          <GloveIcon active={hasGloved} />
          <span className={`font-barlow font-semibold ${hasGloved ? "text-fight-red" : "text-gray-500"}`}>
            {post.gloves?.length || 0}
          </span>
        </button>

        {/* KO (Super Like) */}
        <button
          onClick={handleKO}
          className={`flex items-center gap-2 ko-button ${koAnimating ? "ko-active" : ""}`}
          data-testid="ko-btn"
        >
          <span
            className={`font-anton text-xl transition-all ${
              hasKOd
                ? "text-fight-red drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            KO
          </span>
          <span className={`font-barlow font-semibold ${hasKOd ? "text-fight-red" : "text-gray-500"}`}>
            {post.kos?.length || 0}
          </span>
        </button>

        {/* Comments */}
        <button
          onClick={handleToggleComments}
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors"
          data-testid="comments-btn"
        >
          <MessageSquare size={22} />
          <span className="font-barlow font-semibold">{post.comment_count}</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-fight-concrete" data-testid="comments-section">
          {/* Add Comment */}
          <form onSubmit={handleAddComment} className="p-4 flex gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={getAvatarUrl(user?.profile_photo)} />
              <AvatarFallback className="bg-fight-black text-fight-red font-anton text-xs">
                {user?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Drop a comment..."
              className="flex-1 bg-black border-fight-concrete text-white h-9"
              data-testid="comment-input"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!newComment.trim()}
              className="bg-fight-red hover:bg-red-700 h-9 px-3"
              data-testid="submit-comment-btn"
            >
              <Send size={16} />
            </Button>
          </form>

          {/* Comments List */}
          <div className="px-4 pb-4 space-y-3">
            {loadingComments ? (
              <div className="text-center text-gray-500 py-4">Loading comments...</div>
            ) : comments.length === 0 ? (
              <div className="text-center text-gray-500 py-4 font-barlow">
                No comments yet. Be the first!
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3" data-testid={`comment-${comment.id}`}>
                  <Link to={`/profile/${comment.user_id}`}>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={getAvatarUrl(comment.user_photo)} />
                      <AvatarFallback className="bg-fight-black text-fight-red font-anton text-xs">
                        {comment.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 bg-fight-black rounded-sm p-3">
                    <div className="flex items-center justify-between">
                      <Link
                        to={`/profile/${comment.user_id}`}
                        className="text-white font-barlow font-semibold text-sm hover:text-fight-red"
                      >
                        {comment.username}
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs font-barlow">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                        {comment.user_id === user?.id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-gray-500 hover:text-fight-red"
                            data-testid={`delete-comment-${comment.id}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-300 font-barlow text-sm mt-1">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
