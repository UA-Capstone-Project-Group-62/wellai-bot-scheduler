import { type handleUnaryCall } from "@grpc/grpc-js";
import { QueryRequest, QueryResponse, TimeRange } from "../../../proto/gen/ts/proto/scheduling/scheduling";

export const query: handleUnaryCall<QueryRequest, QueryResponse> = (
  call,
  callback
) => {
  console.log("Query called for clinic:", call.request.clinicId);
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const threeHoursLater = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  const response = QueryResponse.create({
    availableSlots: [
      TimeRange.create({ startTime: oneHourLater, endTime: twoHoursLater }),
      TimeRange.create({ startTime: twoHoursLater, endTime: threeHoursLater }),
    ],
  });
  callback(null, response);
};
