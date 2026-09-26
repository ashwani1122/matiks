import { User } from "@/app/page";

export default function OnlineUsers({ users }: { users: User[] }) {
  return (
    <div>
      <div>
        <h1>Active users</h1>
        <div>
          {users.map((user) => {
            return <div>{user.name}</div>;
          })}
        </div>
      </div>
    </div>
  );
}
