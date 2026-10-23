import { Avatar } from "@/components/Avatar";
import { Video } from "@/components/Video";
import type { LevelTeacher } from "@/lib/levelTeachers";

/** The avatar teacher who presents one level's video lessons. */
export function LevelTeacherCard({
  teacher,
  heading,
  localText,
  videoLabel,
  noVideo,
}: {
  teacher: LevelTeacher;
  heading: string;
  localText: string | null;
  videoLabel: string;
  noVideo: string;
}) {
  return (
    <div className="panel level-teacher">
      <Avatar name={teacher.name} url={teacher.photo_url} size={88} />
      <div className="stack" style={{ gap: 8 }}>
        <strong>{heading}</strong>
        {teacher.intro && (
          <p className="intro" lang="en">
            {teacher.intro}
          </p>
        )}
        {localText && <p className="small muted">{localText}</p>}
        {teacher.video_url && (
          <details>
            <summary className="small">{videoLabel}</summary>
            <div style={{ marginTop: 10 }}>
              <Video url={teacher.video_url} title={heading} emptyText={noVideo} />
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
